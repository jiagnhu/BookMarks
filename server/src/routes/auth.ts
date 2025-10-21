import { Router } from 'express';
import { prisma } from '../prisma.js';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Simple request logger for debugging auth endpoints
router.use((req, _res, next) => {
  const tag = '[auth]';
  // Do not log passwords
  const { password, ...rest } = (req.body || {});
  console.log(tag, req.method, req.path, { query: req.query, body: rest, publicAllowed: (req as any).__publicAllowed });
  next();
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, username: user.username, avatar: user.avatar || 'U' } });
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ id: req.user!.id, username: req.user!.username });
});

// Change password (authenticated)
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing old/new password' });
    if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128) {
      return res.status(400).json({ error: 'Invalid new password' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ok = await argon2.verify(user.passwordHash, oldPassword);
    if (!ok) return res.status(400).json({ error: 'Old password incorrect' });
    const newHash = await argon2.hash(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    return res.status(204).end();
  } catch (e) { next(e); }
});

// Register new user
router.post('/register', async (req, res, next) => {
  try {
    const schema = z.object({
      username: z.string().trim().min(3).max(64).regex(/^[A-Za-z0-9_\-\.]+$/),
      password: z.string().min(6).max(128),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid username or password' });
    const { username, password } = parsed.data;
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(409).json({ error: 'Username already exists' });
    const passwordHash = await argon2.hash(password);
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { username, passwordHash, avatar: username.slice(0,1).toUpperCase(), userType: 'normal' } });
      await tx.page.createMany({ data: [
        { userId: u.id, code: 'A' },
        { userId: u.id, code: 'B' },
      ] });
      await tx.userSettings.create({ data: { userId: u.id } });
      // Set initial skin upload quota by userType mapping
      const initialQuotaByType: Record<string, number> = {
        normal: 3,
        typeD: 5,
        typeC: 10,
        typeB: 20,
        typeA: 30,
      };
      const quota = initialQuotaByType[u.userType as keyof typeof initialQuotaByType] ?? 3;
      await tx.quota.create({ data: { userId: u.id, skinUploadQuota: quota } });
      return u;
    });
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    return res.status(201).json({ token, user: { id: user.id, username: user.username, avatar: user.avatar || 'U' } });
  } catch (e) { next(e); }
});

export default router;
