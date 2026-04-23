import { Router, Request, Response } from 'express';
import pool from '../db';
import { RowDataPacket } from 'mysql2';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { name, password } = req.body;
  if (!name || !password) {
    res.status(400).json({ error: 'name and password are required' });
    return;
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, password, role, owner_name AS ownerName
       FROM users
       WHERE LOWER(name) = LOWER(?) AND password = ?
       LIMIT 1`,
      [name, password]
    );
    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid name or password' });
      return;
    }
    const user = rows[0];
    res.json({
      id:        user.id,
      name:      user.name,
      role:      user.role,
      ownerName: user.ownerName,
    });
  } catch (err) {
    console.error('POST /auth/login', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
