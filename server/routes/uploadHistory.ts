import { Router, Request, Response } from 'express';
import pool from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// ── GET /api/upload-history ─────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [uploads] = await pool.query<RowDataPacket[]>(
      `SELECT id, uploaded_by AS uploadedBy,
              uploaded_at AS timestamp,
              task_count AS taskCount
       FROM upload_history
       ORDER BY uploaded_at DESC`
    );

    if (uploads.length === 0) { res.json([]); return; }

    const uploadIds = uploads.map(u => u.id);
    const placeholders = uploadIds.map(() => '?').join(',');
    const [taskLinks] = await pool.query<RowDataPacket[]>(
      `SELECT upload_id, task_id FROM upload_history_tasks WHERE upload_id IN (${placeholders})`,
      uploadIds
    );

    const taskIdsMap: Record<string, string[]> = {};
    for (const link of taskLinks) {
      if (!taskIdsMap[link.upload_id]) taskIdsMap[link.upload_id] = [];
      taskIdsMap[link.upload_id].push(link.task_id);
    }

    const result = uploads.map(u => ({
      id:          u.id,
      uploadedBy:  u.uploadedBy,
      timestamp:   u.timestamp instanceof Date ? u.timestamp.toISOString() : String(u.timestamp),
      taskCount:   u.taskCount,
      taskIds:     taskIdsMap[u.id] ?? [],
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /upload-history', err);
    res.status(500).json({ error: 'Failed to fetch upload history' });
  }
});

// ── POST /api/upload-history ────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const { id, uploadedBy, timestamp, taskCount, taskIds } = req.body;
  if (!id || !uploadedBy || !Array.isArray(taskIds)) {
    res.status(400).json({ error: 'id, uploadedBy, and taskIds are required' });
    return;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO upload_history (id, uploaded_by, uploaded_at, task_count)
       VALUES (?, ?, ?, ?)`,
      [id, uploadedBy, timestamp ? new Date(timestamp) : new Date(), taskCount ?? taskIds.length]
    );
    for (const taskId of taskIds) {
      await conn.execute(
        'INSERT IGNORE INTO upload_history_tasks (upload_id, task_id) VALUES (?, ?)',
        [id, taskId]
      );
    }
    await conn.commit();
    res.status(201).json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('POST /upload-history', err);
    res.status(500).json({ error: 'Failed to save upload history' });
  } finally {
    conn.release();
  }
});

// ── DELETE /api/upload-history/:id ─────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM upload_history WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Upload record not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /upload-history/:id', err);
    res.status(500).json({ error: 'Failed to delete upload record' });
  }
});

export default router;
