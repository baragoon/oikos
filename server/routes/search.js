/**
 * Modul: Globale Suche (Search)
 * Zweck: Volltext-Suche über Aufgaben, Kalender-Events und Notizen
 * Abhängigkeiten: express, server/db.js
 */

import express from 'express';
import * as db from '../db.js';

const router = express.Router();

const LIMIT = 5;

/**
 * GET /api/v1/search?q=<query>
 * Durchsucht Aufgaben, Kalender-Events und Notizen des Nutzers.
 * Response: { tasks: Task[], events: Event[], notes: Note[] }
 */
router.get('/', (req, res) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) return res.json({ tasks: [], events: [], notes: [] });

    const like = `%${q}%`;
    const userId = req.session.userId;

    const tasks = db.get().prepare(`
      SELECT id, title, status, priority, due_date
      FROM tasks
      WHERE parent_task_id IS NULL
        AND (created_by = ? OR assigned_to = ?)
        AND (title LIKE ? OR description LIKE ?)
      ORDER BY CASE status WHEN 'done' THEN 1 ELSE 0 END,
               due_date ASC NULLS LAST
      LIMIT ?
    `).all(userId, userId, like, like, LIMIT);

    const events = db.get().prepare(`
      SELECT id, title, start_datetime, all_day
      FROM calendar_events
      WHERE created_by = ?
        AND (title LIKE ? OR description LIKE ?)
      ORDER BY start_datetime ASC
      LIMIT ?
    `).all(userId, like, like, LIMIT);

    const notes = db.get().prepare(`
      SELECT id, title, content
      FROM notes
      WHERE created_by = ?
        AND (title LIKE ? OR content LIKE ?)
      ORDER BY pinned DESC, updated_at DESC
      LIMIT ?
    `).all(userId, like, like, LIMIT);

    res.json({ tasks, events, notes });
  } catch (err) {
    res.status(500).json({ error: 'Interner Fehler', code: 500 });
  }
});

export default router;
