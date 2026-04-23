import { Router, Request, Response } from 'express';
import pool from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Task, TimeEvent, ReworkEntry, Comment } from '../../src/types';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert a DB row (snake_case) into a Task (camelCase). */
function rowToTask(row: RowDataPacket): Task {
  return {
    id:                   row.id,
    title:                row.title,
    client:               row.client,
    seoOwner:             row.seo_owner,
    seoStage:             row.seo_stage,
    currentOwner:         row.current_owner,
    isCompleted:          row.is_completed === 1,
    seoQcStatus:          row.seo_qc_status,
    contentStatus:        row.content_status,
    webStatus:            row.web_status,
    intakeDate:           row.intake_date ? String(row.intake_date).split('T')[0] : '',
    contentAssignedDate:  row.content_assigned_date ? String(row.content_assigned_date).split('T')[0] : '',
    webAssignedDate:      row.web_assigned_date ? String(row.web_assigned_date).split('T')[0] : '',
    daysInStage:          row.days_in_stage,
    estHours:             parseFloat(row.est_hours) || 0,
    estHoursSEO:          parseFloat(row.est_hours_seo) || 0,
    estHoursContent:      parseFloat(row.est_hours_content) || 0,
    estHoursWeb:          parseFloat(row.est_hours_web) || 0,
    actualHours:          parseFloat(row.actual_hours) || 0,
    focusedKw:            row.focused_kw ?? undefined,
    volume:               row.volume ?? undefined,
    currentRank:          row.current_rank ?? undefined,
    marRank:              row.mar_rank ?? undefined,
    contentOwner:         row.content_owner ?? undefined,
    webOwner:             row.web_owner ?? undefined,
    targetUrl:            row.target_url ?? undefined,
    remarks:              row.remarks ?? undefined,
    executionState:       row.execution_state,
    docUrl:               row.doc_url ?? undefined,
    timeEvents:           [],
    reworkEntries:        [],
    comments:             [],
  };
}

/** Load all nested data (timeEvents, reworkEntries, comments) for a list of tasks. */
async function attachNested(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) return tasks;

  const ids = tasks.map(t => t.id);
  const placeholders = ids.map(() => '?').join(',');

  const [[timeRows], [reworkRows], [commentRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT id, task_id, event_type AS type, timestamp, department
       FROM task_time_events
       WHERE task_id IN (${placeholders})
       ORDER BY timestamp`,
      ids
    ),
    pool.query<RowDataPacket[]>(
      `SELECT id, task_id, date, est_hours, assigned_dept, assigned_owner,
              within_estimate, hours_already_spent,
              start_timestamp, end_timestamp, duration_ms
       FROM task_rework_entries
       WHERE task_id IN (${placeholders})
       ORDER BY date`,
      ids
    ),
    pool.query<RowDataPacket[]>(
      `SELECT id, task_id, author, text, timestamp
       FROM task_comments
       WHERE task_id IN (${placeholders})
       ORDER BY timestamp`,
      ids
    ),
  ]);

  const taskMap = new Map(tasks.map(t => [t.id, t]));

  for (const r of timeRows) {
    const t = taskMap.get(r.task_id);
    if (t) {
      t.timeEvents!.push({
        type:       r.type as TimeEvent['type'],
        timestamp:  r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp),
        department: r.department,
      });
    }
  }

  for (const r of reworkRows) {
    const t = taskMap.get(r.task_id);
    if (t) {
      t.reworkEntries!.push({
        id:                 r.id,
        date:               String(r.date).split('T')[0],
        estHours:           parseFloat(r.est_hours) || 0,
        assignedDept:       r.assigned_dept as 'Content' | 'Web',
        assignedOwner:      r.assigned_owner,
        withinEstimate:     r.within_estimate === 1,
        hoursAlreadySpent:  parseFloat(r.hours_already_spent) || 0,
        startTimestamp:     r.start_timestamp instanceof Date
                              ? r.start_timestamp.toISOString()
                              : (r.start_timestamp ? String(r.start_timestamp) : ''),
        endTimestamp:       r.end_timestamp instanceof Date
                              ? r.end_timestamp.toISOString()
                              : (r.end_timestamp ? String(r.end_timestamp) : undefined),
        durationMs:         r.duration_ms ? Number(r.duration_ms) : undefined,
      } as ReworkEntry);
    }
  }

  for (const r of commentRows) {
    const t = taskMap.get(r.task_id);
    if (t) {
      t.comments!.push({
        id:        r.id,
        author:    r.author,
        text:      r.text,
        timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp),
      } as Comment);
    }
  }

  return tasks;
}

/** Upsert a single task row (no nested data). */
async function upsertTaskRow(conn: any, task: Task) {
  await conn.execute(
    `INSERT INTO tasks
       (id, title, client, seo_owner, seo_stage, current_owner, is_completed,
        seo_qc_status, content_status, web_status, intake_date, content_assigned_date,
        web_assigned_date, days_in_stage, est_hours, est_hours_seo, est_hours_content,
        est_hours_web, actual_hours, focused_kw, volume, current_rank, mar_rank,
        content_owner, web_owner, target_url, remarks, execution_state, doc_url)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title), client = VALUES(client),
       seo_owner = VALUES(seo_owner), seo_stage = VALUES(seo_stage),
       current_owner = VALUES(current_owner), is_completed = VALUES(is_completed),
       seo_qc_status = VALUES(seo_qc_status), content_status = VALUES(content_status),
       web_status = VALUES(web_status), intake_date = VALUES(intake_date),
       content_assigned_date = VALUES(content_assigned_date),
       web_assigned_date = VALUES(web_assigned_date),
       days_in_stage = VALUES(days_in_stage), est_hours = VALUES(est_hours),
       est_hours_seo = VALUES(est_hours_seo), est_hours_content = VALUES(est_hours_content),
       est_hours_web = VALUES(est_hours_web), actual_hours = VALUES(actual_hours),
       focused_kw = VALUES(focused_kw), volume = VALUES(volume),
       current_rank = VALUES(current_rank), mar_rank = VALUES(mar_rank),
       content_owner = VALUES(content_owner), web_owner = VALUES(web_owner),
       target_url = VALUES(target_url), remarks = VALUES(remarks),
       execution_state = VALUES(execution_state), doc_url = VALUES(doc_url)`,
    [
      task.id, task.title, task.client, task.seoOwner, task.seoStage,
      task.currentOwner, task.isCompleted ? 1 : 0,
      task.seoQcStatus, task.contentStatus, task.webStatus,
      task.intakeDate || null, task.contentAssignedDate || null, task.webAssignedDate || null,
      task.daysInStage, task.estHours, task.estHoursSEO, task.estHoursContent,
      task.estHoursWeb, task.actualHours,
      task.focusedKw ?? null, task.volume ?? null,
      task.currentRank ?? null, task.marRank ?? null,
      task.contentOwner ?? null, task.webOwner ?? null,
      task.targetUrl ?? null, task.remarks ?? null,
      task.executionState ?? 'Not Started', task.docUrl ?? null,
    ]
  );
}

/** Replace all nested data (timeEvents, reworkEntries, comments) for a task. */
async function replaceNested(conn: any, task: Task) {
  // Delete all existing nested rows
  await conn.execute('DELETE FROM task_time_events WHERE task_id = ?', [task.id]);
  await conn.execute('DELETE FROM task_rework_entries WHERE task_id = ?', [task.id]);
  await conn.execute('DELETE FROM task_comments WHERE task_id = ?', [task.id]);

  // Re-insert timeEvents
  for (const e of task.timeEvents ?? []) {
    await conn.execute(
      `INSERT INTO task_time_events (task_id, event_type, timestamp, department)
       VALUES (?, ?, ?, ?)`,
      [task.id, e.type, new Date(e.timestamp), e.department]
    );
  }

  // Re-insert reworkEntries
  for (const rw of task.reworkEntries ?? []) {
    await conn.execute(
      `INSERT INTO task_rework_entries
         (id, task_id, date, est_hours, assigned_dept, assigned_owner,
          within_estimate, hours_already_spent, start_timestamp, end_timestamp, duration_ms)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        rw.id, task.id, rw.date, rw.estHours, rw.assignedDept, rw.assignedOwner,
        rw.withinEstimate ? 1 : 0, rw.hoursAlreadySpent,
        rw.startTimestamp ? new Date(rw.startTimestamp) : null,
        rw.endTimestamp ? new Date(rw.endTimestamp) : null,
        rw.durationMs ?? null,
      ]
    );
  }

  // Re-insert comments
  for (const c of task.comments ?? []) {
    await conn.execute(
      `INSERT INTO task_comments (id, task_id, author, text, timestamp)
       VALUES (?,?,?,?,?)`,
      [c.id, task.id, c.author, c.text, new Date(c.timestamp)]
    );
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/tasks
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tasks ORDER BY intake_date DESC, created_at DESC'
    );
    const tasks = rows.map(rowToTask);
    const hydrated = await attachNested(tasks);
    res.json(hydrated);
  } catch (err) {
    console.error('GET /tasks', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tasks WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) { res.status(404).json({ error: 'Task not found' }); return; }
    const [task] = await attachNested([rowToTask(rows[0])]);
    res.json(task);
  } catch (err) {
    console.error('GET /tasks/:id', err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST /api/tasks
router.post('/', async (req: Request, res: Response) => {
  const task: Task = req.body;
  if (!task?.id || !task?.title) {
    res.status(400).json({ error: 'id and title are required' });
    return;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await upsertTaskRow(conn, task);
    await replaceNested(conn, task);
    await conn.commit();
    res.status(201).json(task);
  } catch (err: any) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Task with this id already exists' });
      return;
    }
    console.error('POST /tasks', err);
    res.status(500).json({ error: 'Failed to create task' });
  } finally {
    conn.release();
  }
});

// PUT /api/tasks/:id  — full replace (task + all nested)
router.put('/:id', async (req: Request, res: Response) => {
  const task: Task = { ...req.body, id: req.params.id };
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await upsertTaskRow(conn, task);
    await replaceNested(conn, task);
    await conn.commit();
    res.json(task);
  } catch (err) {
    await conn.rollback();
    console.error('PUT /tasks/:id', err);
    res.status(500).json({ error: 'Failed to update task' });
  } finally {
    conn.release();
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM tasks WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) { res.status(404).json({ error: 'Task not found' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /tasks/:id', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// POST /api/tasks/bulk-delete  — delete multiple tasks by ID array
router.post('/bulk-delete', async (req: Request, res: Response) => {
  const { ids } = req.body as { ids: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required' });
    return;
  }
  const placeholders = ids.map(() => '?').join(',');
  try {
    await pool.execute(`DELETE FROM tasks WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error('POST /tasks/bulk-delete', err);
    res.status(500).json({ error: 'Failed to bulk delete tasks' });
  }
});

// POST /api/tasks/bulk-upsert  — create or update many tasks at once (CSV upload)
router.post('/bulk-upsert', async (req: Request, res: Response) => {
  const tasks: Task[] = req.body;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    res.status(400).json({ error: 'Payload must be a non-empty array of tasks' });
    return;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const task of tasks) {
      await upsertTaskRow(conn, task);
      await replaceNested(conn, task);
    }
    await conn.commit();
    res.status(201).json({ success: true, count: tasks.length });
  } catch (err) {
    await conn.rollback();
    console.error('POST /tasks/bulk-upsert', err);
    res.status(500).json({ error: 'Failed to bulk upsert tasks' });
  } finally {
    conn.release();
  }
});

export default router;
