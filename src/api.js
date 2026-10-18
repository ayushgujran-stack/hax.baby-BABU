// Reusable API Client for THIS SUCKS.™ Backend

const API_BASE = '/api';

export async function placeOrder(productName) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: productName })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to place order with CEO Babu.');
  }

  return data;
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
  const res = await fetch(`${API_BASE}/visitors`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to get visitor count.');
  }
  return data.count;
}

export async function recordVisitorHit() {
  const res = await fetch(`${API_BASE}/visitors/hit`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to record visitor hit.');
  }
  return data.count;
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
  const res = await fetch(`${API_BASE}/guestbook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, visitorId })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to record review with CEO Babu.');
  }

  return data;
}

export async function getGuestbookFeed(limit = 20) {
  const res = await fetch(`${API_BASE}/guestbook?limit=${limit}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load guestbook messages.');
  }

  return data.messages || [];
}

export async function getVisitorMemory(visitorId) {
  if (!visitorId) return { success: true, recognized: false };

  const res = await fetch(`${API_BASE}/guestbook/visitor-memory?visitorId=${encodeURIComponent(visitorId)}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    return { success: true, recognized: false };
  }

  return data;
}

