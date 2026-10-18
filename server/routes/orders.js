import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// The three approved fictional products
export const APPROVED_PRODUCTS = [
  'Pacifier my aunt gifted',
  'Found at Suzie’s house',
  'It just spawned on my bedroom'
];

// Helper to normalize product string for matching
function matchApprovedProduct(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().toLowerCase();
  for (const approved of APPROVED_PRODUCTS) {
    if (approved.toLowerCase() === trimmed) {
      return approved;
    }
  }
  return null;
}

// POST /api/orders - Place a new pacifier order
router.post('/', (req, res) => {
  try {
    const { product } = req.body || {};

    if (!product) {
      return res.status(400).json({
        success: false,
        error: 'Product name is required. Babu cannot fulfill orders of thin air.'
      });
    }

    const matchedProduct = matchApprovedProduct(product);

    if (!matchedProduct) {
      return res.status(400).json({
        success: false,
        error: `Invalid product "${product}". Approved products are: ${APPROVED_PRODUCTS.join(', ')}.`
      });
    }

    // Generate unique order ID
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
    const createdAt = new Date().toISOString();
    const status = 'AWAITING_CEO_APPROVAL';

    // Persist in SQLite
    const insertStmt = db.prepare(`
      INSERT INTO orders (id, product_name, status, created_at)
      VALUES (?, ?, ?, ?)
    `);
    insertStmt.run(orderId, matchedProduct, status, createdAt);

    return res.status(201).json({
      success: true,
      orderId,
      product: matchedProduct,
      status,
      createdAt,
      confirmation: {
        headline: 'ORDER PLACED!',
        message: 'Delivery after sucked and approved by CEO.'
      }
    });
  } catch (err) {
    console.error('Order creation error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Babu dropped his pacifier. Please retry in a moment.'
    });
  }
});

// GET /api/orders - Retrieve recent orders
router.get('/', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const rows = db.prepare(`
      SELECT id, product_name, status, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    return res.json({
      success: true,
      orders: rows
    });
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve orders.'
    });
  }
});

export default router;
