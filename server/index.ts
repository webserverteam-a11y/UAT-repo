import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes         from './routes/auth';
import tasksRoutes        from './routes/tasks';
import usersRoutes        from './routes/users';
import adminOptionsRoutes from './routes/adminOptions';
import uploadHistoryRoutes from './routes/uploadHistory';

dotenv.config();

const app  = express();
const PORT = Number(process.env.PORT || process.env.SERVER_PORT) || 3000;

// ── Middleware ───────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10mb' }));   // tasks with many events can be large

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/tasks',         tasksRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/admin-options', adminOptionsRoutes);
app.use('/api/upload-history', uploadHistoryRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`SEO Dashboard API server running on http://localhost:${PORT}`);
});

export default app;
