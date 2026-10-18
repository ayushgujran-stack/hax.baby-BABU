// Vercel Serverless Function for THIS SUCKS.™ Pacifier Orders
// Handles POST /api/orders on deployed Vercel environments

export const APPROVED_PRODUCTS = [
  'Pacifier my aunt gifted',
  'Found at Suzie’s house',
  'It just spawned on my bedroom'
];

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const product = body.product;

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

      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
      const createdAt = new Date().toISOString();
      const status = 'AWAITING_CEO_APPROVAL';

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
      console.error('Vercel order processing error:', err);
      return res.status(500).json({
        success: false,
        error: 'Babu dropped his pacifier. Please retry in a moment.'
      });
    }
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      approvedProducts: APPROVED_PRODUCTS
    });
  }

  return res.status(405).json({
    success: false,
    error: 'Method Not Allowed'
  });
}
