const { query } = require('../db/schema');
const { createError } = require('../middleware/errorHandler');

async function listUsers({ role, status, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  let sql = 'SELECT * FROM users WHERE 1=1';
  const params = [];

  if (role) {
    params.push(role);
    sql += ` AND role = $${params.length}`;
  }
  if (status) {
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }

  sql += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

  const { rows } = await query(sql, params);
  
  // Count total for pagination
  let countSql = 'SELECT COUNT(*) FROM users WHERE 1=1';
  const countParams = [];
  if (role) { countParams.push(role); countSql += ` AND role = $${countParams.length}`; }
  if (status) { countParams.push(status); countSql += ` AND status = $${countParams.length}`; }

  const { rows: countResult } = await query(countSql, countParams);
  const total = parseInt(countResult[0].count, 10);

  const { sanitizeUser } = require('./authService');
  return {
    data: rows.map(sanitizeUser),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getUserById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  const user = rows[0];
  if (!user) throw createError('User not found.', 404);
  const { sanitizeUser } = require('./authService');
  return sanitizeUser(user);
}

async function updateUser(id, data) {
  const { role, status } = data;
  const updates = [];
  const params = [id];
  let i = 2;

  if (role) { updates.push(`role = $${i++}`); params.push(role); }
  if (status) { updates.push(`status = $${i++}`); params.push(status); }
  updates.push(`updated_at = NOW()`);

  const { rows } = await query(`
    UPDATE users SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING *
  `, params);

  if (rows.length === 0) throw createError('User not found.', 404);
  const { sanitizeUser } = require('./authService');
  return sanitizeUser(rows[0]);
}

async function deleteUser(id) {
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
  if (rowCount === 0) throw createError('User not found.', 404);
  return { message: 'User deleted permanently.' };
}

module.exports = { listUsers, getUserById, updateUser, deleteUser };
