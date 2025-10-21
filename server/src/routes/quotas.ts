import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/skin-upload', async (req, res, next) => {
  try {
    let q = await prisma.quota.findUnique({ where: { userId: req.user!.id } });
    if (!q) q = await prisma.quota.create({ data: { userId: req.user!.id } });
    res.json({ used: q.skinUploadUsed, quota: q.skinUploadQuota, left: Math.max(q.skinUploadQuota - q.skinUploadUsed, 0) });
  } catch (e) { next(e); }
});

export default router;

