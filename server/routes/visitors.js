import { Router } from 'express';
import { db } from '../db.js';
import {
  dbFirestore,
  isFirebaseConfigured,
  FieldValue,
  VISITOR_COUNTER_COLLECTION,
  VISITOR_COUNTER_DOC
} from '../firebase.js';

const router = Router();

// GET /api/visitors - Retrieve persistent visitor count
router.get('/', async (req, res) => {
  // 1. If Firebase Cloud Firestore is configured, fetch from Firestore
  if (isFirebaseConfigured && dbFirestore) {
    try {
      const docRef = dbFirestore.collection(VISITOR_COUNTER_COLLECTION).doc(VISITOR_COUNTER_DOC);
      const snapshot = await docRef.get();

      if (snapshot.exists) {
        const data = snapshot.data();
        return res.json({
          success: true,
          count: typeof data.count === 'number' ? data.count : 1337,
          lastHitAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : new Date().toISOString(),
          backend: 'firestore'
        });
      } else {
        // Initialize the visitorCounter document if not present
        const initialCount = 1337;
        await docRef.set({
          count: initialCount,
          updatedAt: FieldValue.serverTimestamp()
        });
        return res.json({
          success: true,
          count: initialCount,
          lastHitAt: new Date().toISOString(),
          backend: 'firestore'
        });
      }
    } catch (err) {
      console.error('🔥 [Firestore] Error reading visitorCounter:', err.message);
      // Fallback gracefully to local database
    }
  }

  // 2. Local fallback database (SQLite)
  try {
    const row = db.prepare('SELECT count, last_hit_at FROM visitors WHERE id = 1').get();
    return res.json({
      success: true,
      count: row ? row.count : 1337,
      lastHitAt: row ? row.last_hit_at : new Date().toISOString(),
      backend: 'local'
    });
  } catch (err) {
    console.error('Error fetching visitor count from local fallback:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve visitor count.'
    });
  }
});

// POST /api/visitors/hit - Register a new unique visitor hit
router.post('/hit', async (req, res) => {
  // 1. If Firebase Cloud Firestore is configured, perform atomic increment
  if (isFirebaseConfigured && dbFirestore) {
    try {
      const docRef = dbFirestore.collection(VISITOR_COUNTER_COLLECTION).doc(VISITOR_COUNTER_DOC);

      // Atomic increment on Firestore document
      await docRef.set({
        count: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      // Fetch the updated count to return to the client
      const updatedSnap = await docRef.get();
      const updatedData = updatedSnap.data() || {};
      const newCount = typeof updatedData.count === 'number' ? updatedData.count : 1338;

      return res.json({
        success: true,
        count: newCount,
        lastHitAt: updatedData.updatedAt ? (updatedData.updatedAt.toDate ? updatedData.updatedAt.toDate().toISOString() : updatedData.updatedAt) : new Date().toISOString(),
        backend: 'firestore'
      });
    } catch (err) {
      console.error('🔥 [Firestore] Error incrementing visitorCounter:', err.message);
      // Fallback gracefully to local database if Firestore encounters an error
    }
  }

  // 2. Local fallback database (SQLite)
  try {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE visitors
      SET count = count + 1, last_hit_at = ?
      WHERE id = 1
    `).run(now);

    const updated = db.prepare('SELECT count, last_hit_at FROM visitors WHERE id = 1').get();

    return res.json({
      success: true,
      count: updated.count,
      lastHitAt: updated.last_hit_at,
      backend: 'local'
    });
  } catch (err) {
    console.error('Error incrementing visitor hit on local database:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to record visitor.'
    });
  }
});

export default router;
