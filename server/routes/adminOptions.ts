import { Router, Request, Response } from 'express';
import pool from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AdminOptions } from '../../src/types';

const router = Router();

const OPTION_TYPES: (keyof AdminOptions)[] = [
  'clients', 'seoOwners', 'contentOwners', 'webOwners',
  'seoStages', 'seoQcStatuses', 'contentStatuses', 'webStatuses',
];

// ── GET /api/admin-options ──────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT option_type AS optionType, value
       FROM admin_options
       ORDER BY option_type, sort_order, value`
    );

    const result: AdminOptions = {
      clients: [], seoOwners: [], contentOwners: [], webOwners: [],
      seoStages: [], seoQcStatuses: [], contentStatuses: [], webStatuses: [],
    };

    for (const row of rows) {
      const key = row.optionType as keyof AdminOptions;
      if (result[key]) result[key].push(row.value as never);
    }

    res.json(result);
  } catch (err) {
    console.error('GET /admin-options', err);
    res.status(500).json({ error: 'Failed to fetch admin options' });
  }
});

// ── PUT /api/admin-options ──────────────────────────────────
// Accepts the full AdminOptions object and replaces all rows
// for every option_type that is present in the payload.
router.put('/', async (req: Request, res: Response) => {
  const body: Partial<AdminOptions> = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const key of OPTION_TYPES) {
      const values = body[key];
      if (!Array.isArray(values)) continue;

      // Delete existing entries for this type
      await conn.execute(
        'DELETE FROM admin_options WHERE option_type = ?',
        [key]
      );

      // Re-insert with proper sort_order
      for (let i = 0; i < values.length; i++) {
        await conn.execute(
          `INSERT INTO admin_options (option_type, value, sort_order)
           VALUES (?, ?, ?)`,
          [key, values[i], i]
        );
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('PUT /admin-options', err);
    res.status(500).json({ error: 'Failed to update admin options' });
  } finally {
    conn.release();
  }
});

export default router;
