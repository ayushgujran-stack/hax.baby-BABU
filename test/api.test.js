import assert from 'node:assert';
import app, { server } from '../server/index.js';
import { db } from '../server/db.js';

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log('🧪 Starting THIS SUCKS.™ Backend Test Suite...\n');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${name}:`, err.message);
      throw err;
    }
  }

  try {
    // 1. Health check
    await test('GET /api/health returns healthy status and Babu/Tommy credentials', async () => {
      const res = await fetch(`${BASE_URL}/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'healthy');
      assert.strictEqual(data.ceo, 'Babu');
      assert.strictEqual(data.cso, 'Tommy the dog');
    });

    // 2. Orders validation & persistence
    await test('POST /api/orders places valid order for "Pacifier my aunt gifted"', async () => {
      const res = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'Pacifier my aunt gifted' })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.orderId.startsWith('ORD-'));
      assert.strictEqual(data.product, 'Pacifier my aunt gifted');
      assert.strictEqual(data.confirmation.headline, 'ORDER PLACED!');
      assert.strictEqual(data.confirmation.message, 'Delivery after sucked and approved by CEO.');

      // Verify persistent in SQLite
      const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(data.orderId);
      assert.ok(row, 'Order must be saved in database');
      assert.strictEqual(row.product_name, 'Pacifier my aunt gifted');
    });

    await test('POST /api/orders places valid order for "Found at Suzie’s house"', async () => {
      const res = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'Found at Suzie’s house' })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.product, 'Found at Suzie’s house');
    });

    await test('POST /api/orders places valid order for "It just spawned on my bedroom"', async () => {
      const res = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'It just spawned on my bedroom' })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.product, 'It just spawned on my bedroom');
    });

    await test('POST /api/orders rejects invalid product names with 400', async () => {
      const res = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'Rolex Gold Pacifier' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.error.includes('Invalid product'));
    });

    await test('POST /api/orders rejects empty body with 400', async () => {
      const res = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 3. Complaints
    await test('POST /api/complaints saves complaint and returns RESOLVED BY BABU', async () => {
      const text = 'MY PACIFIER HAS BITE MARKS.';
      const res = await fetch(`${BASE_URL}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint: text })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.complaintId.startsWith('CMP-'));
      assert.strictEqual(data.status, 'RESOLVED BY BABU');
      assert.ok(data.babuResponse.includes('clapping'));

      // Verify persistent in SQLite
      const row = db.prepare('SELECT * FROM complaints WHERE id = ?').get(data.complaintId);
      assert.ok(row, 'Complaint must be saved in database');
      assert.strictEqual(row.complaint_text, text);
      assert.strictEqual(row.status, 'RESOLVED BY BABU');
    });

    await test('POST /api/complaints rejects empty or short text with 400', async () => {
      const res = await fetch(`${BASE_URL}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint: 'bad' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    await test('POST /api/complaints rejects excessively long text (> 500 chars) with 400', async () => {
      const longText = 'A'.repeat(505);
      const res = await fetch(`${BASE_URL}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint: longText })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 4. Visitor counter
    await test('GET /api/visitors returns current count and POST /api/visitors/hit increments persistently', async () => {
      const getRes = await fetch(`${BASE_URL}/visitors`);
      assert.strictEqual(getRes.status, 200);
      const initial = await getRes.json();
      const initialCount = initial.count;

      const hitRes = await fetch(`${BASE_URL}/visitors/hit`, { method: 'POST' });
      assert.strictEqual(hitRes.status, 200);
      const afterHit = await hitRes.json();
      assert.strictEqual(afterHit.count, initialCount + 1);

      // Verify directly from SQLite
      const row = db.prepare('SELECT count FROM visitors WHERE id = 1').get();
      assert.strictEqual(row.count, initialCount + 1);
    });

    // 5. Classified Files
    await test('GET /api/classified-files returns the three comedic supply chain files', async () => {
      const res = await fetch(`${BASE_URL}/classified-files`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.files.length, 3);
      assert.strictEqual(data.files[0].title, 'THE BLACK JACKET DEAL');
      assert.strictEqual(data.files[1].title, 'FIVE-FINGER DISCOUNT');
      assert.strictEqual(data.files[2].title, 'OPERATION TOMMY');
      assert.strictEqual(data.finalStamp, 'YOU SAW NOTHING.');
      assert.strictEqual(data.additionalNote, 'If Mom asks, you were never here.');
    });

    console.log(`\n🎉 All ${passed}/${total} backend integration tests passed!`);
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
