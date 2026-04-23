import { Router, Request, Response } from 'express';
import pool from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// ── GET /api/users ──────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, role, owner_name AS ownerName FROM users ORDER BY created_at'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /users', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── POST /api/users ─────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const { id, name, password, role, ownerName } = req.body;
  if (!id || !name || !password || !role) {
    res.status(400).json({ error: 'id, name, password, and role are required' });
    return;
  }
  try {
    await pool.execute(
      `INSERT INTO users (id, name, password, role, owner_name)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, password, role, ownerName || '']
    );
    res.status(201).json({ id, name, role, ownerName: ownerName || '' });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'User with this id or name already exists' });
      return;
    }
    console.error('POST /users', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ── PUT /api/users/:id ──────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, password, role, ownerName } = req.body;
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE users SET name = ?, password = ?, role = ?, owner_name = ?
       WHERE id = ?`,
      [name, password, role, ownerName ?? '', id]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ id, name, role, ownerName: ownerName ?? '' });
  } catch (err) {
    console.error('PUT /users/:id', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ── DELETE /api/users/:id ───────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (id === 'admin') {
    res.status(403).json({ error: 'Cannot delete the default admin account' });
    return;
  }
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /users/:id', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
