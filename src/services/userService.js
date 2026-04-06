/**
 * User Service
 * CRUD operations for user management. Only admins can call most of these.
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/schema');
const { createError } = require('../middleware/errorHandler');
const { sanitizeUser } = require('./authService');

/**
 * List all users (with optional filtering by role/status and pagination).
 * @param {{ role?: string, status?: string, page?: number, limit?: number }} opts
 */
function listUsers({ role, status, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];

  if (role)   { conditions.push('role = ?');   params.push(role); }
  if (status) { conditions.push('status = ?'); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const rows = db.prepare(`
    SELECT * FROM users ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) AS count FROM users ${where}`)
    .get(...params).count;

  return {
    data: rows.map(sanitizeUser),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Get a single user by ID.
 */
function getUserById(id) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) throw createError('User not found.', 404);
  return sanitizeUser(user);
}

/**
 * Create a user (admin-only endpoint).
 */
function createUser({ username, email, password, role = 'viewer' }) {
  const bcrypt = require('bcryptjs');
  const existing = db
    .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .get(username, email);
  if (existing) throw createError('Username or email already in use.', 409);

  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, username, email, password, role, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(id, username, email, hashedPassword, role);

  return getUserById(id);
}

/**
 * Update a user's role and/or status.
 * Admins cannot deactivate themselves.
 */
function updateUser(id, updates, requesterId) {
  const user = getUserById(id); // throws 404 if not found

  if (id === requesterId && updates.status === 'inactive') {
    throw createError('Admins cannot deactivate their own account.', 400);
  }

  const fields = [];
  const params = [];

  if (updates.role !== undefined)   { fields.push('role = ?');   params.push(updates.role); }
  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }

  if (fields.length === 0) throw createError('No updatable fields provided.', 400);

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getUserById(id);
}

/**
 * Delete a user permanently (admin-only).
 * An admin cannot delete themselves.
 */
function deleteUser(id, requesterId) {
  if (id === requesterId) throw createError('Admins cannot delete their own account.', 400);

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) throw createError('User not found.', 404);

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return { message: 'User deleted successfully.' };
}

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser };
