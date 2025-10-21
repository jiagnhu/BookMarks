import './loadEnv.js';
import { createServer } from 'http';
import app from './app.js';

const PORT = Number(process.env.PORT || 4000);

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

