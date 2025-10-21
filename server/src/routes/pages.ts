import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import argon2 from 'argon2';

const router = Router();

// 公共页面信息（未登录用）
router.get('/public/:code', async (req, res, next) => {
  try {
    const code = req.params.code === 'B' ? 'B' : 'A';
    const p = await prisma.publicPage.findFirst({ where: { code: code as any } });
    if (!p) return res.json({ code, title: null, motto: null, hasBPassword: false });
    res.json({ code: p.code, title: p.title, motto: p.motto, hasBPassword: !!p.bPasswordHash });
  } catch (e) { next(e); }
});

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const pages = await prisma.page.findMany({ where: { userId: req.user!.id } });
    res.json(pages.map(p => ({ id: p.id, code: p.code, title: p.title, motto: p.motto, hasBPassword: !!p.bPasswordHash })));
  } catch (e) { next(e); }
});

router.get('/:code', async (req, res, next) => {
  try {
    const code = req.params.code === 'B' ? 'B' : 'A';
    const p = await prisma.page.findFirst({ where: { userId: req.user!.id, code: code as any } });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ id: p.id, code: p.code, title: p.title, motto: p.motto, hasBPassword: !!p.bPasswordHash, updatedAt: p.updatedAt });
  } catch (e) { next(e); }
});

router.put('/:code', async (req, res, next) => {
  try {
    const code = req.params.code === 'B' ? 'B' : 'A';
    const { title, motto } = req.body || {};
    const p = await prisma.page.upsert({
      where: { userId_code: { userId: req.user!.id, code: code as any } },
      update: { title, motto },
      create: { userId: req.user!.id, code: code as any, title, motto },
    });
    res.json({ id: p.id, code: p.code, title: p.title, motto: p.motto });
  } catch (e) { next(e); }
});

router.post('/B/password', async (req, res, next) => {
  try {
    const { password } = req.body || {};
    const code: 'B' = 'B';
    const hash = password ? await argon2.hash(password) : null;
    await prisma.page.upsert({
      where: { userId_code: { userId: req.user!.id, code } },
      update: { bPasswordHash: hash },
      create: { userId: req.user!.id, code, bPasswordHash: hash },
    });
    res.status(204).end();
  } catch (e) { next(e); }
});

router.post('/B/verify', async (req, res, next) => {
  try {
    const { password } = req.body || {};
    const p = await prisma.page.findFirst({ where: { userId: req.user!.id, code: 'B' } });
    if (!p || !p.bPasswordHash) return res.json({ ok: true });
    const ok = await argon2.verify(p.bPasswordHash, password || '');
    return res.json({ ok });
  } catch (e) { next(e); }
});

export default router;
