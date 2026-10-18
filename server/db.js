import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || './data/paci_boss.db';
const resolvedDbPath = path.resolve(process.cwd(), dbPath);

// Ensure the parent directory exists
const dir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new DatabaseSync(resolvedDbPath);

// Initialize schema
export function initDatabase() {
  // Enable WAL mode for better concurrency and reliability
  db.exec('PRAGMA journal_mode = WAL;');

  // Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AWAITING_CEO_APPROVAL',
      created_at TEXT NOT NULL
    );
  `);

  // Complaints table
  db.exec(`
    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      complaint_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'RESOLVED BY BABU',
      created_at TEXT NOT NULL
    );
  `);

  // Guestbook messages table (persistent local fallback for Firestore)
  db.exec(`
    CREATE TABLE IF NOT EXISTS guestbook_messages (
      id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      sentiment TEXT NOT NULL DEFAULT 'neutral',
      babu_response TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'RESOLVED BY BABU',
      created_at TEXT NOT NULL
    );
  `);

  // Visitors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      count INTEGER NOT NULL DEFAULT 1337,
      last_hit_at TEXT NOT NULL
    );
  `);

  // Seed visitor row if missing
  const existingVisitor = db.prepare('SELECT id, count FROM visitors WHERE id = 1').get();
  if (!existingVisitor) {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO visitors (id, count, last_hit_at) VALUES (1, 1337, ?)').run(now);
  }
}

// Initialize on module load
initDatabase();
