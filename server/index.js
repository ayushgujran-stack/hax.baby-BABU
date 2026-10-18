import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './db.js'; // Ensure database is initialized

import ordersRouter from './routes/orders.js';
import complaintsRouter from './routes/complaints.js';
import visitorsRouter from './routes/visitors.js';
import classifiedRouter from './routes/classified.js';
import guestbookRouter from './routes/guestbook.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser with size limits
app.use(express.json({ limit: '25kb' }));

// Simple in-memory rate limiter for mutation endpoints
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 60;

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
  } else {
    record.count += 1;
  }

  rateLimitMap.set(ip, record);

  if (record.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      success: false,
      error: 'Whoa there! Babu needs a nap before handling more requests. Rate limit exceeded.'
    });
  }

  next();
}

// Cleanup stale rate limit records every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 300000);
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    ceo: 'Babu',
    cso: 'Tommy the dog',
    napStatus: 'In progress',
    timestamp: new Date().toISOString()
  });
});

// Mount feature routes
app.use('/api/orders', rateLimiter, ordersRouter);
app.use('/api/complaints', rateLimiter, complaintsRouter);
app.use('/api/guestbook', rateLimiter, guestbookRouter);
app.use('/api/visitors', visitorsRouter);
app.use('/api/classified-files', classifiedRouter);

// 404 handler for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found. Did Tommy the dog chew this URL?'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server mishap. Babu spilled his milk.'
  });
});

export const server = app.listen(PORT, () => {
  console.log(`🍼 THIS SUCKS.™ Backend API running on port ${PORT}`);
  console.log(`📁 Database: ${process.env.DB_PATH || './data/paci_boss.db'}`);
});

export default app;
