import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// POST /api/complaints - Submit customer complaint
router.post('/', (req, res) => {
  try {
    const rawText = req.body?.complaint || req.body?.text;

    if (typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Complaint text is required. You cannot silently grumble at the CEO.'
      });
    }

    const complaintText = rawText.trim();

    if (complaintText.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Complaint too brief. Babu requires at least 5 characters to adequately grasp your grievance.'
      });
    }

    if (complaintText.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Complaint exceeds the 500 character limit. Babu does not have the toddler attention span to read essays.'
      });
    }

    // Generate unique complaint ID
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const complaintId = `CMP-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
    const createdAt = new Date().toISOString();
    const status = 'RESOLVED BY BABU';

    // Store in SQLite
    const insertStmt = db.prepare(`
      INSERT INTO complaints (id, complaint_text, status, created_at)
      VALUES (?, ?, ?, ?)
    `);
    insertStmt.run(complaintId, complaintText, status, createdAt);

    return res.status(201).json({
      success: true,
      complaintId,
      status,
      babuResponse: 'Babu smiled, started clapping enthusiastically, and filed your grievance directly under his nap pillow.',
      createdAt
    });
  } catch (err) {
    console.error('Complaint creation error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Babu threw his rattle. Please retry submitting your complaint.'
    });
  }
});

// GET /api/complaints - Retrieve recent customer complaints
router.get('/', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const rows = db.prepare(`
      SELECT id, complaint_text, status, created_at
      FROM complaints
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    return res.json({
      success: true,
      complaints: rows
    });
  } catch (err) {
    console.error('Error fetching complaints:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve complaints.'
    });
  }
});

export default router;
