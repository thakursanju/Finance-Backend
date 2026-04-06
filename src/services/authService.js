/**
 * Auth Service
 * Handles user registration, login, and JWT issuance.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/schema');
const { JWT_SECRET, JWT_EXPIRES } = require('../config');
const { createError } = require('../middleware/errorHandler');

/**
 * Register a new user.
 * Only admins can set roles other than 'viewer' (enforced at the route level).
 */
function register({ username, email, password, role = 'viewer' }) {
  // Check uniqueness
  const existingUser = db
    .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .get(username, email);
  if (existingUser) {
    throw createError('Username or email already in use.', 409);
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const id = uuidv4();

  db.prepare(`
    INSERT INTO users (id, username, email, password, role, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(id, username, email, hashedPassword, role);

  return getUserById(id);
}

/**
 * Authenticate credentials and return a signed JWT.
 */
function login({ email, password }) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
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

function getUserById(id) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) throw createError('User not found.', 404);
  return sanitizeUser(user);
}

/** Strip the password hash from a user row before returning to client. */
function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

module.exports = { register, login, getUserById, sanitizeUser };
