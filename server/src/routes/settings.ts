import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
// 公共设置（未登录时获取）
router.get('/public', async (_req, res, next) => {
  try {
    // 假定公共设置唯一，取 first 或创建默认
    let s = await prisma.publicSettings.findFirst();
    if (!s) {
      s = await prisma.publicSettings.create({ data: { boardAlpha: 55, cardAlpha: 55, vignette: 25, headerMask: 25, showcaseWidth: 28, contrast: false, skinUrl: '/images/p1.jpeg' } });
    }
    res.json({
      boardAlpha: s.boardAlpha,
      cardAlpha: s.cardAlpha,
      vignette: s.vignette,
      headerMask: s.headerMask,
      showcaseWidth: s.showcaseWidth,
      contrast: s.contrast,
      skinUrl: s.skinUrl,
    });
  } catch (e) { next(e); }
});

// 登录用户设置
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    let s = await prisma.userSettings.findUnique({ where: { userId: req.user!.id } });
    if (!s) {
      s = await prisma.userSettings.create({ data: { userId: req.user!.id } });
    }
    res.json({
      boardAlpha: s.boardAlpha,
      cardAlpha: s.cardAlpha,
      vignette: s.vignette,
      headerMask: s.headerMask,
      showcaseWidth: s.showcaseWidth,
      contrast: s.contrast,
    });
  } catch (e) { next(e); }
});

router.put('/', async (req, res, next) => {
  try {
    const { boardAlpha, cardAlpha, vignette, headerMask, showcaseWidth, contrast } = req.body || {};
    await prisma.userSettings.upsert({
      where: { userId: req.user!.id },
      update: { boardAlpha, cardAlpha, vignette, headerMask, showcaseWidth, contrast },
      create: { userId: req.user!.id, boardAlpha, cardAlpha, vignette, headerMask, showcaseWidth, contrast },
    });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
