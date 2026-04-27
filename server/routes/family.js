/**
 * Module: Family
 * Purpose: Read-only family member API.
 * Dependencies: express, server/db.js
 */

import express from 'express';
import * as db from '../db.js';
import { createLogger } from '../logger.js';

const log = createLogger('Family');
const router = express.Router();

router.get('/members', (req, res) => {
  try {
    const members = db.get().prepare(`
      SELECT id, display_name, avatar_color, family_role, created_at
      FROM users
      ORDER BY display_name COLLATE NOCASE ASC
    `).all();
    res.json({ data: members });
  } catch (err) {
    log.error('GET /members error:', err);
    res.status(500).json({ error: 'Internal server error.', code: 500 });
  }
});

export default router;
