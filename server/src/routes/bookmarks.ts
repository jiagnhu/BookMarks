import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// 公共书签（未登录）
router.get('/public/pages/:code/bookmarks', async (req, res, next) => {
  try {
    const code = req.params.code === 'B' ? 'B' : 'A';
    const page = await prisma.publicPage.findFirst({ where: { code: code as any } });
    if (!page) return res.json([]);
    const items = await prisma.publicBookmark.findMany({ where: { pageId: page.id }, orderBy: { orderIndex: 'asc' } });
    res.json(items.map(i => ({ id: i.id, order: i.orderIndex, name: i.name, url: i.url })));
  } catch (e) { next(e); }
});

router.use(requireAuth);

router.get('/pages/:code/bookmarks', async (req, res, next) => {
  try {
    const code = req.params.code === 'B' ? 'B' : 'A';
    const page = await prisma.page.findFirst({ where: { userId: req.user!.id, code: code as any } });
    if (!page) return res.json([]);
    const items = await prisma.bookmark.findMany({ where: { pageId: page.id }, orderBy: { orderIndex: 'asc' } });
    res.json(items.map(i => ({ id: i.id, order: i.orderIndex, name: i.name, url: i.url })));
  } catch (e) { next(e); }
});

router.put('/pages/:code/bookmarks', async (req, res, next) => {
  try {
    const code = req.params.code === 'B' ? 'B' : 'A';
    const { items } = req.body || {};
    const page = await prisma.page.upsert({
      where: { userId_code: { userId: req.user!.id, code: code as any } },
      update: {},
      create: { userId: req.user!.id, code: code as any },
    });
    await prisma.$transaction([
      prisma.bookmark.deleteMany({ where: { pageId: page.id } }),
      ...((items || []) as any[]).map((it, idx) => prisma.bookmark.create({ data: {
        pageId: page.id,
        orderIndex: it.order ?? idx,
        name: String(it.name||'').slice(0,128) || `链接 ${idx+1}`,
        url: String(it.url||'').slice(0,512)
      }}))
    ]);
    res.status(204).end();
  } catch (e) { next(e); }
});

router.patch('/bookmarks/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, url, order } = req.body || {};
    const b = await prisma.bookmark.update({ where: { id }, data: {
      name, url, orderIndex: order
    }});
    res.json({ id: b.id, order: b.orderIndex, name: b.name, url: b.url });
  } catch (e) { next(e); }
});

router.post('/pages/:code/bookmarks', async (req, res, next) => {
  try {
    const code = req.params.code === 'B' ? 'B' : 'A';
    const page = await prisma.page.findFirst({ where: { userId: req.user!.id, code: code as any } });
    if (!page) return res.status(404).json({ error: 'Page not found' });
    const { name, url, order } = req.body || {};
    const created = await prisma.bookmark.create({ data: { pageId: page.id, name, url, orderIndex: order ?? 0 } });
    res.status(201).json({ id: created.id, order: created.orderIndex, name: created.name, url: created.url });
  } catch (e) { next(e); }
});

router.delete('/bookmarks/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.bookmark.delete({ where: { id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
