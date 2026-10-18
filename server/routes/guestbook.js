// ============================================================================
// GUESTBOOK & REVIEW SUBMISSION API ROUTER
// - Persists reviews in Cloud Firestore (with SQLite fallback)
// - Server-side sentiment analysis & Babu reaction generation
// - Public message stream (with visitorId stripped for privacy)
// - Returning-visitor memory lookup
// ============================================================================

import { Router } from 'express';
import { db } from '../db.js';
import {
  dbFirestore,
  isFirebaseConfigured,
  FieldValue,
  GUESTBOOK_COLLECTION
} from '../firebase.js';
import {
  analyzeSentiment,
  getBabuReaction,
  getReturningGreeting
} from '../sentiment.js';

const router = Router();

/**
 * Basic HTML escaping to prevent stored XSS
 * @param {string} str
 * @returns {string}
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ----------------------------------------------------------------------------
// POST /api/guestbook - Submit a new review / guestbook message
// ----------------------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const rawMessage = req.body?.message || req.body?.complaint || req.body?.text;
    const rawVisitorId = req.body?.visitorId;

    // 1. Validate message presence and type
    if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Review message is required. Babu cannot read blank parchment.'
      });
    }

    const trimmedMessage = rawMessage.trim();

    // 2. Validate length
    if (trimmedMessage.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Message too brief. Babu needs at least 5 characters to understand.'
      });
    }

    if (trimmedMessage.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Message exceeds the 500 character limit. Babu cannot read novels.'
      });
    }

    // 3. Validate or assign anonymous visitorId
    const visitorId = (typeof rawVisitorId === 'string' && rawVisitorId.trim())
      ? rawVisitorId.trim().substring(0, 64)
      : `anon-${Math.random().toString(36).substring(2, 12)}`;

    // 4. Server-side sentiment classification & reaction selection
    const sentiment = analyzeSentiment(trimmedMessage);
    const babuResponse = getBabuReaction(sentiment);
    const status = 'RESOLVED BY BABU';
    const createdAtIso = new Date().toISOString();

    // Generate unique document ID
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const messageId = `GB-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

    const sanitizedMessage = sanitizeText(trimmedMessage);

    // 5. Persist to Firestore (if configured)
    let persistedToFirestore = false;
    if (isFirebaseConfigured && dbFirestore) {
      try {
        const docRef = dbFirestore.collection(GUESTBOOK_COLLECTION).doc(messageId);
        await docRef.set({
          message: sanitizedMessage,
          visitorId: visitorId, // Stored internally for returning memory, never leaked in public feed
          sentiment: sentiment,
          babuResponse: babuResponse,
          status: status,
          createdAt: FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date()
        });
        persistedToFirestore = true;
      } catch (err) {
        console.error('🔥 [Firestore] Error saving guestbook entry:', err.message);
      }
    }

    // 6. Always persist to SQLite (local mirror & reliable fallback)
    try {
      const insertStmt = db.prepare(`
        INSERT INTO guestbook_messages (id, message, visitor_id, sentiment, babu_response, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertStmt.run(messageId, sanitizedMessage, visitorId, sentiment, babuResponse, status, createdAtIso);
    } catch (err) {
      console.error('SQLite guestbook insert notice:', err.message);
    }

    // 7. Return success response with Babu's reaction and sanitized data
    return res.status(201).json({
      success: true,
      messageId,
      message: sanitizedMessage,
      sentiment,
      babuResponse,
      status,
      createdAt: createdAtIso,
      backend: persistedToFirestore ? 'firestore' : 'local'
    });
  } catch (err) {
    console.error('Guestbook submission error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Babu threw his bottle. Failed to save your message. Please try again.'
    });
  }
});

// ----------------------------------------------------------------------------
// GET /api/guestbook - Retrieve recent public guestbook messages (sanitized feed)
// ----------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 20, 50));

    // 1. Try fetching from Firestore first
    if (isFirebaseConfigured && dbFirestore) {
      try {
        const snapshot = await dbFirestore
          .collection(GUESTBOOK_COLLECTION)
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get();

        if (!snapshot.empty) {
          const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            let dateStr = new Date().toISOString();
            if (data.createdAt) {
              if (typeof data.createdAt.toDate === 'function') {
                dateStr = data.createdAt.toDate().toISOString();
              } else if (typeof data.createdAt === 'string') {
                dateStr = data.createdAt;
              }
            }

            return {
              id: doc.id,
              message: data.message || '',
              sentiment: data.sentiment || 'neutral',
              babuResponse: data.babuResponse || 'Babu clapped enthusiastically.',
              status: data.status || 'RESOLVED BY BABU',
              createdAt: dateStr
              // PRIVACY CRITICAL: visitorId is intentionally omitted!
            };
          });

          return res.json({
            success: true,
            messages,
            backend: 'firestore'
          });
        }
      } catch (err) {
        console.error('🔥 [Firestore] Error reading guestbook collection:', err.message);
      }
    }

    // 2. Local fallback from SQLite
    try {
      const rows = db.prepare(`
        SELECT id, message, sentiment, babu_response AS babuResponse, status, created_at AS createdAt
        FROM guestbook_messages
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limit);

      return res.json({
        success: true,
        messages: rows || [],
        backend: 'local'
      });
    } catch (err) {
      console.error('SQLite guestbook read error:', err.message);
      return res.json({
        success: true,
        messages: []
      });
    }
  } catch (err) {
    console.error('Error fetching guestbook:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve guestbook entries.'
    });
  }
});

// ----------------------------------------------------------------------------
// GET /api/guestbook/visitor-memory - Contextual greeting for returning visitors
// ----------------------------------------------------------------------------
router.get('/visitor-memory', async (req, res) => {
  try {
    const rawVisitorId = req.query.visitorId;

    if (!rawVisitorId || typeof rawVisitorId !== 'string' || !rawVisitorId.trim()) {
      return res.json({
        success: true,
        recognized: false
      });
    }

    const visitorId = rawVisitorId.trim().substring(0, 64);

    // 1. Query Firestore for this specific visitor's latest submission
    if (isFirebaseConfigured && dbFirestore) {
      try {
        const snapshot = await dbFirestore
          .collection(GUESTBOOK_COLLECTION)
          .where('visitorId', '==', visitorId)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          const messageText = data.message || '';
          const excerpt = messageText.length > 60 ? `${messageText.substring(0, 57)}...` : messageText;
          const sentiment = data.sentiment || 'neutral';
          const greeting = getReturningGreeting(sentiment, excerpt);

          return res.json({
            success: true,
            recognized: true,
            sentiment,
            previousMessage: excerpt,
            greeting,
            lastVisitAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn('🔥 [Firestore] visitor memory check fallback:', err.message);
      }
    }

    // 2. Query SQLite fallback
    try {
      const row = db.prepare(`
        SELECT message, sentiment, created_at AS createdAt
        FROM guestbook_messages
        WHERE visitor_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(visitorId);

      if (row) {
        const excerpt = row.message.length > 60 ? `${row.message.substring(0, 57)}...` : row.message;
        const greeting = getReturningGreeting(row.sentiment, excerpt);

        return res.json({
          success: true,
          recognized: true,
          sentiment: row.sentiment,
          previousMessage: excerpt,
          greeting,
          lastVisitAt: row.createdAt
        });
      }
    } catch (err) {
      console.warn('SQLite visitor memory lookup error:', err.message);
    }

    return res.json({
      success: true,
      recognized: false
    });
  } catch (err) {
    console.error('Visitor memory lookup error:', err.message);
    return res.json({
      success: true,
      recognized: false
    });
  }
});

export default router;
