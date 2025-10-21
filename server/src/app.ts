import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import pagesRoutes from './routes/pages.js';
import bookmarksRoutes from './routes/bookmarks.js';
import skinsRoutes from './routes/skins.js';
import settingsRoutes from './routes/settings.js';
import quotasRoutes from './routes/quotas.js';
import metaRoutes from './routes/meta.js';
import linksRoutes from './routes/links.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Public allowlist bypass to avoid any accidental auth interception upstream.
// This middleware runs BEFORE routers are mounted.
app.use((req, _res, next) => {
  // Normalize method + path
  const m = req.method.toUpperCase();
  const p = req.path;
  // Auth (anonymous)
  if (m === 'POST' && (p === '/api/v1/auth/login' || p === '/api/v1/auth/register')) {
    // tag request as public; routers will handle response
    (req as any).__publicAllowed = true;
    return next();
  }
  // Public GET endpoints
  const publicGets = [
    '/api/v1/skins/preset',
    '/api/v1/settings/public',
    '/api/v1/skins/public/current',
  ];
  if (m === 'GET' && publicGets.includes(p)) { (req as any).__publicAllowed = true; return next(); }
  // Patterned public routes
  if (m === 'GET' && (/^\/api\/v1\/pages\/public\/(A|B)$/.test(p) || /^\/api\/v1\/public\/pages\/(A|B)\/bookmarks$/.test(p))) {
    (req as any).__publicAllowed = true; return next();
  }
  return next();
});

// Public endpoints must be reachable without auth. Mount order matters.
app.use('/api/v1/skins', skinsRoutes);       // contains /preset and /public/current (public) and auth routes
app.use('/api/v1/settings', settingsRoutes); // contains /public (public) and auth routes
app.use('/api/v1/pages', pagesRoutes);       // contains /public/:code (public) and auth routes
app.use('/api/v1', bookmarksRoutes);         // contains /public/pages/:code/bookmarks (public) and auth routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/links', linksRoutes);       // user-specific JSON links
app.use('/api/v1/quotas', quotasRoutes);
app.use('/api/v1/meta', metaRoutes);

app.use(errorHandler);

export default app;
