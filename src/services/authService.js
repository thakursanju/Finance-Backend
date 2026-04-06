/**
 * Auth Service
 * Handles user registration, login, and JWT issuance using PostgreSQL.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/schema');
const { JWT_SECRET, JWT_EXPIRES } = require('../config');
const { createError } = require('../middleware/errorHandler');

/**
 * Register a new user.
 */
async function register({ username, email, password, role = 'viewer' }) {
  // Check uniqueness
  const { rows: existing } = await query(
    'SELECT id FROM users WHERE username = $1 OR email = $2',
    [username, email]
  );
  if (existing.length > 0) {
    throw createError('Username or email already in use.', 409);
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const id = uuidv4();

  await query(`
    INSERT INTO users (id, username, email, password, role, status)
    VALUES ($1, $2, $3, $4, $5, 'active')
  `, [id, username, email, hashedPassword, role]);

  return await getUserById(id);
}

/**
 * Authenticate credentials and return a signed JWT.
 */
async function login({ email, password }) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  if (!user) throw createError('Invalid credentials.', 401);
  if (user.status === 'inactive') throw createError('Account is inactive.', 403);

  const passwordMatch = bcrypt.compareSync(password, user.password);
  if (!passwordMatch) throw createError('Invalid credentials.', 401);

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return {
    token,
    user: sanitizeUser(user),
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function getUserById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  const user = rows[0];
  if (!user) throw createError('User not found.', 404);
  return sanitizeUser(user);
}

/** Strip the password hash from a user row before returning to client. */
function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

module.exports = { register, login, getUserById, sanitizeUser };
