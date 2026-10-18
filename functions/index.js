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

// ============================================================================
// GUESTBOOK CLOUD FUNCTION (Serverless Endpoint)
// ============================================================================

const GUESTBOOK_COLLECTION = 'guestbook';

function analyzeSentimentQuick(text) {
  if (!text) return 'neutral';
  const lower = text.toLowerCase();
  if (lower.includes("doesn't work") || lower.includes("not working") || lower.includes("broken") || lower.includes("glitch") || lower.includes("bug")) {
    return 'issue';
  }
  if (lower.includes("not bad") || lower.includes("love") || lower.includes("great") || lower.includes("best") || lower.includes("awesome") || lower.includes("cute") || lower.includes("good")) {
    return 'positive';
  }
  if (lower.includes("terrible") || lower.includes("worst") || lower.includes("awful") || lower.includes("hate") || lower.includes("trash")) {
    return 'negative';
  }
  return 'neutral';
}

function getBabuResponseText(sentiment) {
  switch (sentiment) {
    case 'positive':
      return "YOU'RE MY FAVOURITE HUMAN! I AM PROMOTING YOU TO SENIOR SUCKER.";
    case 'negative':
      return "WOW. OKAY. I AM GOING TO CRY ABOUT THIS IN BOARDROOM A.";
    case 'issue':
      return "OH NO. MOM! WE HAVE A TECHNICAL GLITCH! CODE RED IN NURSERY!";
    case 'neutral':
    default:
      return "HMM. I WILL THINK ABOUT THIS DURING NAP TIME.";
  }
}

export const guestbook = onRequest({ cors: true }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const colRef = db.collection(GUESTBOOK_COLLECTION);

  try {
    // 1. GET /visitor-memory
    if (req.method === 'GET' && (req.path.includes('visitor-memory') || req.query.visitorId)) {
      const visitorId = (req.query.visitorId || '').trim();
      if (!visitorId) {
        return res.json({ success: true, recognized: false });
      }

      const snap = await colRef
        .where('visitorId', '==', visitorId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!snap.empty) {
        const data = snap.docs[0].data();
        const excerpt = (data.message || '').substring(0, 60);
        return res.json({
          success: true,
          recognized: true,
          sentiment: data.sentiment || 'neutral',
          previousMessage: excerpt,
          greeting: {
            headline: data.sentiment === 'positive' ? '"YOU\'RE BACK! I REMEMBER YOU!"' : '"YOU AGAIN?! DID YOU BRING A PACIFIER?"',
            subtext: `Babu remembers: "${excerpt}"`,
            tag: "RETURNING INVESTOR DETECTED ★"
          }
        });
      }
      return res.json({ success: true, recognized: false });
    }

    // 2. GET recent guestbook feed
    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
      const snap = await colRef.orderBy('createdAt', 'desc').limit(limit).get();
      const messages = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          message: d.message || '',
          sentiment: d.sentiment || 'neutral',
          babuResponse: d.babuResponse || 'Babu clapped enthusiastically.',
          status: d.status || 'RESOLVED BY BABU',
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString()
        };
      });
      return res.json({ success: true, messages });
    }

    // 3. POST new message
    if (req.method === 'POST') {
      const text = (req.body?.message || req.body?.complaint || req.body?.text || '').trim();
      if (!text || text.length < 5 || text.length > 500) {
        return res.status(400).json({ success: false, error: 'Valid review between 5 and 500 characters required.' });
      }

      const visitorId = (req.body?.visitorId || `anon-${Math.random().toString(36).substring(2, 10)}`).trim();
      const sentiment = analyzeSentimentQuick(text);
      const babuResponse = getBabuResponseText(sentiment);
      const docId = `GB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      await colRef.doc(docId).set({
        message: text,
        visitorId,
        sentiment,
        babuResponse,
        status: 'RESOLVED BY BABU',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return res.status(201).json({
        success: true,
        messageId: docId,
        message: text,
        sentiment,
        babuResponse,
        status: 'RESOLVED BY BABU',
        createdAt: new Date().toISOString()
      });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error handling guestbook Cloud Function:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

