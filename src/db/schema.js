/**
 * Database Schema & Initialization
 * Uses better-sqlite3 for synchronous SQLite access.
 * All tables are created with IF NOT EXISTS so this is idempotent.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// On Vercel, we must use an in-memory database because the filesystem is read-only.
const isVercel = process.env.VERCEL === '1';
const connectionString = isVercel ? ':memory:' : DB_PATH;

const db = new Database(connectionString);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Run all DDL statements to initialize the schema.
 * Safe to call multiple times (idempotent).
 */
function initializeSchema() {
  db.exec(`
    -- ─────────────────────────────────────────────
    -- Users table
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,          -- UUID
      username    TEXT NOT NULL UNIQUE,
      email       TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,             -- bcrypt hash
      role        TEXT NOT NULL DEFAULT 'viewer'  -- 'viewer' | 'analyst' | 'admin'
                  CHECK(role IN ('viewer', 'analyst', 'admin')),
      status      TEXT NOT NULL DEFAULT 'active'  -- 'active' | 'inactive'
                  CHECK(status IN ('active', 'inactive')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─────────────────────────────────────────────
    -- Financial records table
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS financial_records (
      id          TEXT PRIMARY KEY,          -- UUID
      amount      REAL NOT NULL CHECK(amount > 0),
      type        TEXT NOT NULL             -- 'income' | 'expense'
                  CHECK(type IN ('income', 'expense')),
      category    TEXT NOT NULL,
      date        TEXT NOT NULL,            -- ISO 8601 date string YYYY-MM-DD
      notes       TEXT,
      created_by  TEXT NOT NULL REFERENCES users(id),
      is_deleted  INTEGER NOT NULL DEFAULT 0,   -- soft delete flag (0=active, 1=deleted)
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─────────────────────────────────────────────
    -- Indexes for common query patterns
    -- ─────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_records_type     ON financial_records(type)     WHERE is_deleted = 0;
    CREATE INDEX IF NOT EXISTS idx_records_category ON financial_records(category) WHERE is_deleted = 0;
    CREATE INDEX IF NOT EXISTS idx_records_date     ON financial_records(date)     WHERE is_deleted = 0;
    CREATE INDEX IF NOT EXISTS idx_records_created_by ON financial_records(created_by) WHERE is_deleted = 0;
  `);

  console.log('✅ Database schema initialized');
}

// Seed a default admin if no users exist yet
function seedDefaultAdmin() {
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');

  const existing = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!existing) {
    const hashedPassword = bcrypt.hashSync('Admin@123', 10);
    db.prepare(`
      INSERT INTO users (id, username, email, password, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), 'admin', 'admin@finance.local', hashedPassword, 'admin', 'active');
    console.log('🌱 Default admin seeded  →  username: admin  |  password: Admin@123');
  }
}

module.exports = { db, initializeSchema, seedDefaultAdmin };
