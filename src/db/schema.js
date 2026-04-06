/**
 * Database Schema & Initialization
 * Uses pg (PostgreSQL) for cloud-native persistence.
 */

const { Pool } = require('pg');
const { DATABASE_URL } = require('../config');

// Initialize Pool with connection string
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for many cloud Postgres like Supabase/Neon
  }
});

/**
 * Execute a query with parameters
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}

/**
 * Run DDL statements to initialize Postgres schema.
 */
async function initializeSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY,
        username    TEXT NOT NULL UNIQUE,
        email       TEXT NOT NULL UNIQUE,
        password    TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer', 'analyst', 'admin')),
        status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create records table
    await client.query(`
      CREATE TABLE IF NOT EXISTS financial_records (
        id          UUID PRIMARY KEY,
        amount      DECIMAL(15, 2) NOT NULL CHECK(amount > 0),
        type        TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        category    TEXT NOT NULL,
        date        DATE NOT NULL,
        notes       TEXT,
        created_by  UUID NOT NULL REFERENCES users(id),
        is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_records_type     ON financial_records(type)     WHERE is_deleted = FALSE;');
    await client.query('CREATE INDEX IF NOT EXISTS idx_records_category ON financial_records(category) WHERE is_deleted = FALSE;');
    await client.query('CREATE INDEX IF NOT EXISTS idx_records_date     ON financial_records(date)     WHERE is_deleted = FALSE;');
    await client.query('CREATE INDEX IF NOT EXISTS idx_records_created_by ON financial_records(created_by) WHERE is_deleted = FALSE;');

    await client.query('COMMIT');
    console.log('✅ PostgreSQL database schema initialized');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization failed', e);
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Seed a default admin
 */
async function seedDefaultAdmin() {
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');

  const { rows } = await query('SELECT id FROM users WHERE role = $1', ['admin']);
  if (rows.length === 0) {
    const hashedPassword = bcrypt.hashSync('Admin@123', 10);
    await query(`
      INSERT INTO users (id, username, email, password, role, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [uuidv4(), 'admin', 'admin@finance.local', hashedPassword, 'admin', 'active']);
    console.log('🌱 Default admin seeded');
  }
}

module.exports = { pool, query, initializeSchema, seedDefaultAdmin };
