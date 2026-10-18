// Firebase Cloud Functions for THIS SUCKS.™
// Serverless endpoint for secure visitor counter atomic increments

import { onRequest } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const VISITOR_COUNTER_COLLECTION = 'siteStats';
const VISITOR_COUNTER_DOC = 'visitorCounter';

export const visitors = onRequest({ cors: true }, async (req, res) => {
  // Set CORS headers explicitly
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const docRef = db.collection(VISITOR_COUNTER_COLLECTION).doc(VISITOR_COUNTER_DOC);

  try {
    if (req.method === 'GET') {
      const snap = await docRef.get();
      if (snap.exists) {
        const data = snap.data();
        return res.json({
          success: true,
          count: typeof data.count === 'number' ? data.count : 1337,
          lastHitAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
        });
      } else {
        await docRef.set({
          count: 1337,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return res.json({
          success: true,
          count: 1337,
          lastHitAt: new Date().toISOString()
        });
      }
    }

    if (req.method === 'POST') {
      // Atomic increment
      await docRef.set({
        count: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      const snap = await docRef.get();
      const data = snap.data() || {};
      return res.json({
        success: true,
        count: typeof data.count === 'number' ? data.count : 1338,
        lastHitAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
      });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error handling visitor counter Cloud Function:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});
