import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/preset', (_req, res) => {
  res.json([
    { label: 'p1', url: '/images/p1.jpeg' },
    { label: 'p2', url: '/images/p2.jpeg' },
    { label: 'p3', url: '/images/p3.jpeg' },
  ]);
});

// 公共当前皮肤（未登录）
router.get('/public/current', async (_req, res, next) => {
  try {
    const s = await prisma.publicSettings.findFirst();
    return res.json({ type: 'preset', url: s?.skinUrl || '/images/p1.jpeg' });
  } catch (e) { next(e); }
});

router.use(requireAuth);

router.get('/custom', async (req, res, next) => {
  try {
    const list = await prisma.skin.findMany({ where: { userId: req.user!.id, type: 'custom' }, orderBy: { createdAt: 'desc' } });
    res.json(list.map(s => ({ id: s.id, url: s.url, createdAt: s.createdAt })));
  } catch (e) { next(e); }
});

// 删除自定义皮肤，并归还一次上传配额；若删除的是当前皮肤，则回退到默认预设
router.delete('/custom/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    await prisma.$transaction(async (tx) => {
      const skin = await tx.skin.findUnique({ where: { id } });
      if (!skin || skin.userId !== req.user!.id || skin.type !== 'custom') {
        throw Object.assign(new Error('Not found'), { status: 404 });
      }
      await tx.skin.delete({ where: { id } });
      // 归还配额（已用减一，不低于 0）
      const q = await tx.quota.findUnique({ where: { userId: req.user!.id } });
      if (q && q.skinUploadUsed > 0) {
        await tx.quota.update({ where: { userId: req.user!.id }, data: { skinUploadUsed: { decrement: 1 } } });
      }
      // 如果删除的是当前皮肤，回退到默认预设
      if (skin.isCurrent) {
        await tx.skin.create({ data: { userId: req.user!.id, type: 'preset', url: '/images/p1.jpeg', isCurrent: true } });
      }
    });
    res.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

router.post('/current', async (req, res, next) => {
  try {
    const { type, id, url, label } = req.body || {};
    // 兼容仅传 url 的用法：按自定义皮肤上传处理
    const inferredType = type || (url ? 'custom' : undefined);
    let result: { type: string; id?: number; url: string } | undefined;
    await prisma.$transaction(async (tx) => {
      // 取消当前皮肤
      await tx.skin.updateMany({ where: { userId: req.user!.id, isCurrent: true }, data: { isCurrent: false } });

      if (inferredType === 'custom') {
        if (id) {
          // 使用已存在的自定义皮肤，设为当前
          const updated = await tx.skin.update({ where: { id }, data: { isCurrent: true } });
          result = { type: 'custom', id: updated.id, url: updated.url };
        } else if (url) {
          // 新上传的自定义皮肤：检查配额、创建记录、扣减已用
          let q = await tx.quota.findUnique({ where: { userId: req.user!.id } });
          if (!q) q = await tx.quota.create({ data: { userId: req.user!.id } });
          const left = Math.max(q.skinUploadQuota - q.skinUploadUsed, 0);
          if (left <= 0) {
            throw Object.assign(new Error('No upload quota left'), { status: 403 });
          }
          const created = await tx.skin.create({ data: { userId: req.user!.id, type: 'custom', url, label: label?.slice(0,64), isCurrent: true } });
          await tx.quota.update({ where: { userId: req.user!.id }, data: { skinUploadUsed: { increment: 1 } } });
          result = { type: 'custom', id: created.id, url: created.url };
        }
      } else if (inferredType === 'preset' && url) {
        const created = await tx.skin.create({ data: { userId: req.user!.id, type: 'preset', url, isCurrent: true } });
        result = { type: 'preset', id: created.id, url: created.url };
      }
    });
    if (!result) return res.status(400).json({ error: 'Invalid body: type/id/url' });
    res.json(result);
  } catch (e: any) {
    if (e?.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

// 仅标记当前皮肤：不创建新记录，不扣配额
router.put('/current', async (req, res, next) => {
  try {
    const { type, id, url } = req.body || {};
    if (!type || (type !== 'custom' && type !== 'preset')) return res.status(400).json({ error: 'Invalid type' });
    let result: { type: string; id?: number; url: string } | undefined;
    await prisma.$transaction(async (tx) => {
      // 清除原来的当前标记
      await tx.skin.updateMany({ where: { userId: req.user!.id, isCurrent: true }, data: { isCurrent: false } });
      if (type === 'custom') {
        if (!id) throw Object.assign(new Error('id required for custom'), { status: 400 });
        const updated = await tx.skin.update({ where: { id }, data: { isCurrent: true } });
        result = { type: 'custom', id: updated.id, url: updated.url };
      } else if (type === 'preset') {
        if (!url) throw Object.assign(new Error('url required for preset'), { status: 400 });
        // 查找是否已有相同 url 的 preset 记录；有则复用，无则创建但不扣配额
        const exist = await tx.skin.findFirst({ where: { userId: req.user!.id, type: 'preset', url } });
        if (exist) {
          await tx.skin.update({ where: { id: exist.id }, data: { isCurrent: true } });
          result = { type: 'preset', id: exist.id, url: exist.url };
        } else {
          const created = await tx.skin.create({ data: { userId: req.user!.id, type: 'preset', url, isCurrent: true } });
          result = { type: 'preset', id: created.id, url: created.url };
        }
      }
    });
    if (!result) return res.status(400).json({ error: 'Invalid body' });
    res.json(result);
  } catch (e: any) {
    if (e?.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

router.get('/current', async (req, res, next) => {
  try {
    const cur = await prisma.skin.findFirst({ where: { userId: req.user!.id, isCurrent: true } });
    if (!cur) return res.json({ type: 'preset', url: '/images/p1.jpeg' });
    res.json({ type: cur.type, url: cur.url, id: cur.id });
  } catch (e) { next(e); }
});

export default router;
