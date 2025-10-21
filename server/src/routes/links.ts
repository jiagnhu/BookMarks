import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

type LinkItem = { name: string; url: string };

const DEFAULT_USER_LINKS: LinkItem[] = Array.from({ length: 20 }, (_, i) => ({ name: `链接 ${i+1}`, url: '' }));

// 公共链接（游客用）— 保持现有公共书签表，不在此文件提供；由 bookmarks/pages 路由负责

const router = Router();

// 登录用户专属链接
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const pageQ = String((req.query.page || 'A')).toUpperCase();
    const page = pageQ === 'B' ? 'B' : 'A';
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { linksJsonA: true, linksJsonB: true } });
    const raw = page === 'B' ? (user?.linksJsonB as any[] | null) : (user?.linksJsonA as any[] | null);
    const links = raw ?? DEFAULT_USER_LINKS;
    res.json(links);
  } catch (e) { next(e); }
});

router.put('/', async (req, res, next) => {
  try {
    const pageQ = String((req.query.page || 'A')).toUpperCase();
    const page = pageQ === 'B' ? 'B' : 'A';
    const payload = req.body as unknown;
    if (!Array.isArray(payload)) return res.status(400).json({ message: 'links 必须是数组' });
    // 简单校验元素结构
    const ok = payload.every(it => it && typeof it.name === 'string' && typeof it.url === 'string');
    if (!ok) return res.status(400).json({ message: '每项需包含字符串字段 name 与 url' });
    if (page === 'B')
      await prisma.user.update({ where: { id: req.user!.id }, data: { linksJsonB: payload as any } });
    else
      await prisma.user.update({ where: { id: req.user!.id }, data: { linksJsonA: payload as any } });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
