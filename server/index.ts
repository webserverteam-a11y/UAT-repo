import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes         from './routes/auth';
import tasksRoutes        from './routes/tasks';
import usersRoutes        from './routes/users';
import adminOptionsRoutes from './routes/adminOptions';
import uploadHistoryRoutes from './routes/uploadHistory';
import pool from './db';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = Number(process.env.PORT || process.env.SERVER_PORT) || 3000;

const distPath      = path.join(__dirname, '../dist');
const distIndexHtml = path.join(distPath, 'index.html');
const distExists    = fs.existsSync(distIndexHtml);

// ── Middleware ───────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10mb' }));   // tasks with many events can be large

// ── Serve built React frontend ───────────────────────────────
if (distExists) {
  app.use(express.static(distPath));
} else {
  console.warn('WARNING: dist/ folder not found. Run "npm run build" before starting the server.');
}

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/tasks',         tasksRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/admin-options', adminOptionsRoutes);
app.use('/api/upload-history', uploadHistoryRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Catch-all: serve React app for client-side routing ───────
app.get('*', (_req, res) => {
  if (distExists) {
    res.sendFile(distIndexHtml);
  } else {
    res.status(503).send('Application not built. Run "npm run build" first.');
  }
});

// ── Start ────────────────────────────────────────────────────
pool.getConnection()
  .then(conn => { conn.release(); console.log('Database connection OK'); })
  .catch(err  => console.error('WARNING: Database connection failed on startup:', err.message));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SEO Dashboard API server running on http://0.0.0.0:${PORT}`);
});

export default app;
