// Reusable API Client for THIS SUCKS.™ Backend
// Firebase methods are loaded dynamically on demand
let _fb = null;
async function getFirebase() {
  if (!_fb) _fb = await import('./firebase.js');
  return _fb;
}

const API_BASE = '/api';

export async function placeOrder(productName) {
  // 1. Try local or serverless backend endpoint (/api/orders)
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product: productName })
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend /api/orders unavailable, falling back to direct Firestore:', err.message);
  }

  // 2. Resilient Cloud Firestore fallback for deployed static Vercel environments
  const fb = await getFirebase(); return await fb.placeFirestoreOrder(productName);
}

export async function submitComplaint(complaintText) {
  const res = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ complaint: complaintText })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to file grievance with Babu.');
  }

  return data;
}

export async function getVisitorCount() {
  try {
    const res = await fetch(`${API_BASE}/visitors`);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && typeof data.count === 'number') {
        return data.count;
      }
    }
  } catch (err) {}

  const fb = await getFirebase(); return await fb.fetchFirestoreVisitorCount();
}

export async function recordVisitorHit() {
  try {
    const res = await fetch(`${API_BASE}/visitors/hit`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && typeof data.count === 'number') {
        return data.count;
      }
    }
  } catch (err) {}

  const fb = await getFirebase(); return await fb.recordFirestoreVisitorHit();
}

export async function getClassifiedFiles() {
  const res = await fetch(`${API_BASE}/classified-files`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch classified supply chain files.');
  }
  return data;
}

// ----------------------------------------------------------------------------
// GUESTBOOK & RETURNING VISITOR API METHODS
// ----------------------------------------------------------------------------

export async function submitGuestbookMessage({ message, visitorId }) {
  try {
    const res = await fetch(`${API_BASE}/guestbook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, visitorId })
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend /api/guestbook unavailable, falling back to direct Firestore:', err.message);
  }

  const fb = await getFirebase(); return await fb.submitFirestoreGuestbookMessage({ message, visitorId });
}

export async function getGuestbookFeed(limit = 20) {
  try {
    const res = await fetch(`${API_BASE}/guestbook?limit=${limit}`);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && Array.isArray(data.messages)) {
        return data.messages;
      }
    }
  } catch (err) {}

  const fb = await getFirebase(); return await fb.fetchFirestoreGuestbookMessages(limit);
}

export async function getVisitorMemory(visitorId) {
  if (!visitorId) return { success: true, recognized: false };

  try {
    const res = await fetch(`${API_BASE}/guestbook/visitor-memory?visitorId=${encodeURIComponent(visitorId)}`);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        return data;
      }
    }
  } catch (err) {}

  const fb = await getFirebase(); return await fb.getFirestoreVisitorMemory(visitorId);
}

