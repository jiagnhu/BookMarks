import { Router } from 'express';

const router = Router();

router.get('/version', (_req, res) => {
  res.json({ version: '0.1.0', buildAt: new Date().toISOString() });
});

export default router;

