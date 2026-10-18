import assert from 'node:assert';
import vercelOrdersHandler, { APPROVED_PRODUCTS } from '../api/orders.js';

async function runOrdersTests() {
  console.log('🧪 Starting Orders & Buying Tab Test Suite...\n');
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

  // 1. Approved products list validation
  await test('Verifies the 3 approved fictional pacifier products exist', () => {
    assert.strictEqual(APPROVED_PRODUCTS.length, 3);
    assert.ok(APPROVED_PRODUCTS.includes('Pacifier my aunt gifted'));
    assert.ok(APPROVED_PRODUCTS.includes('Found at Suzie’s house'));
    assert.ok(APPROVED_PRODUCTS.includes('It just spawned on my bedroom'));
  });

  // 2. Vercel Serverless Function: POST /api/orders valid product 1
  await test('Vercel serverless function places valid order for "Pacifier my aunt gifted"', async () => {
    let statusCode = null;
    let responseData = null;
    const req = {
      method: 'POST',
      body: JSON.stringify({ product: 'Pacifier my aunt gifted' })
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; return data; }
        };
      }
    };

    await vercelOrdersHandler(req, res);
    assert.strictEqual(statusCode, 201);
    assert.strictEqual(responseData.success, true);
    assert.ok(responseData.orderId.startsWith('ORD-'));
    assert.strictEqual(responseData.product, 'Pacifier my aunt gifted');
    assert.strictEqual(responseData.status, 'AWAITING_CEO_APPROVAL');
    assert.strictEqual(responseData.confirmation.headline, 'ORDER PLACED!');
    assert.strictEqual(responseData.confirmation.message, 'Delivery after sucked and approved by CEO.');
  });

  // 3. Vercel Serverless Function: POST /api/orders valid product 2 (handles typographical curly quotes)
  await test('Vercel serverless function places valid order for "Found at Suzie’s house"', async () => {
    let statusCode = null;
    let responseData = null;
    const req = {
      method: 'POST',
      body: { product: 'Found at Suzie’s house' }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; return data; }
        };
      }
    };

    await vercelOrdersHandler(req, res);
    assert.strictEqual(statusCode, 201);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.product, 'Found at Suzie’s house');
  });

  // 4. Vercel Serverless Function: POST /api/orders valid product 3
  await test('Vercel serverless function places valid order for "It just spawned on my bedroom"', async () => {
    let statusCode = null;
    let responseData = null;
    const req = {
      method: 'POST',
      body: { product: 'It just spawned on my bedroom' }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; return data; }
        };
      }
    };

    await vercelOrdersHandler(req, res);
    assert.strictEqual(statusCode, 201);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.product, 'It just spawned on my bedroom');
  });

  // 5. Vercel Serverless Function: Rejects invalid products with 400
  await test('Vercel serverless function rejects unapproved products with 400', async () => {
    let statusCode = null;
    let responseData = null;
    const req = {
      method: 'POST',
      body: { product: 'Some Random Pacifier From Walmart' }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; return data; }
        };
      }
    };

    await vercelOrdersHandler(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    assert.ok(responseData.error.includes('Invalid product'));
  });

  // 6. Vercel Serverless Function: Rejects empty product name with 400
  await test('Vercel serverless function rejects empty body with 400', async () => {
    let statusCode = null;
    let responseData = null;
    const req = {
      method: 'POST',
      body: {}
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; return data; }
        };
      }
    };

    await vercelOrdersHandler(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    assert.ok(responseData.error.includes('Product name is required'));
  });

  // 7. GET /api/orders returns approved products list
  await test('Vercel serverless function handles GET /api/orders', async () => {
    let statusCode = null;
    let responseData = null;
    const req = { method: 'GET' };
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; return data; }
        };
      }
    };

    await vercelOrdersHandler(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.approvedProducts.length, 3);
  });

  console.log(`\n🎉 All ${passed}/${total} Orders & Buying Tab Tests Passed Successfully!`);
}

runOrdersTests().catch(err => {
  console.error('\n❌ Orders Test Suite Failed:', err);
  process.exit(1);
});
