import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/visitors - Retrieve persistent visitor count
router.get('/', (req, res) => {
  try {
    const row = db.prepare('SELECT count, last_hit_at FROM visitors WHERE id = 1').get();
    return res.json({
      success: true,
      count: row ? row.count : 1337,
      lastHitAt: row ? row.last_hit_at : new Date().toISOString()
    });
  } catch (err) {
    console.error('Error fetching visitor count:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve visitor count.'
    });
  }
});

// POST /api/visitors/hit - Register a new unique visitor hit
router.post('/hit', (req, res) => {
  try {
    const now = new Date().toISOString();
    // Increment visitor count by 1 atomically
    db.prepare(`
      UPDATE visitors
      SET count = count + 1, last_hit_at = ?
      WHERE id = 1
    `).run(now);

    const updated = db.prepare('SELECT count, last_hit_at FROM visitors WHERE id = 1').get();

    return res.json({
      success: true,
      count: updated.count,
      lastHitAt: updated.last_hit_at
    });
  } catch (err) {
    console.error('Error incrementing visitor hit:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to record visitor.'
    });
  }
});

export default router;
