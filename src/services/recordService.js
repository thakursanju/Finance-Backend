/**
 * Financial Records Service
 * All CRUD operations and filtering for financial records.
 * Soft-delete is used (is_deleted = 1) so historical data is preserved.
 */

const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/schema');
const { createError } = require('../middleware/errorHandler');

// ── Core CRUD ─────────────────────────────────────────────────────────────────

/**
 * Create a new financial record.
 */
function createRecord({ amount, type, category, date, notes }, createdBy) {
  const id = uuidv4();

  db.prepare(`
    INSERT INTO financial_records (id, amount, type, category, date, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, amount, type, category.toLowerCase(), date, notes || null, createdBy);

  return getRecordById(id);
}

/**
 * Get a single record by ID (excluding soft-deleted records).
 */
function getRecordById(id) {
  const record = db.prepare(`
    SELECT * FROM financial_records WHERE id = ? AND is_deleted = 0
  `).get(id);
  if (!record) throw createError('Record not found.', 404);
  return record;
}

/**
 * List records with optional filters and pagination.
 * @param {{
 *   type?: 'income'|'expense',
 *   category?: string,
 *   fromDate?: string,
 *   toDate?: string,
 *   search?: string,
 *   page?: number,
 *   limit?: number,
 *   sortBy?: string,
 *   order?: 'asc'|'desc'
 * }} filters
 */
function listRecords({
  type,
  category,
  fromDate,
  toDate,
  search,
  page = 1,
  limit = 20,
  sortBy = 'date',
  order = 'desc',
} = {}) {
  const conditions = ['is_deleted = 0'];
  const params = [];

  if (type)     { conditions.push('type = ?');           params.push(type); }
  if (category) { conditions.push('category = ?');       params.push(category.toLowerCase()); }
  if (fromDate) { conditions.push('date >= ?');          params.push(fromDate); }
  if (toDate)   { conditions.push('date <= ?');          params.push(toDate); }
  if (search)   {
    conditions.push('(notes LIKE ? OR category LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  // Whitelist sortable columns to prevent SQL injection
  const allowedSortColumns = ['date', 'amount', 'category', 'type', 'created_at'];
  const safeSort  = allowedSortColumns.includes(sortBy) ? sortBy : 'date';
  const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

  const where  = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;

  const rows = db.prepare(`
    SELECT * FROM financial_records ${where}
    ORDER BY ${safeSort} ${safeOrder}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) AS count FROM financial_records ${where}`)
    .get(...params).count;

  return {
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Update mutable fields on a record. Admins only.
 */
function updateRecord(id, updates) {
  getRecordById(id); // throws 404 if not found / already deleted

  const fields = [];
  const params = [];

  const allowed = ['amount', 'type', 'category', 'date', 'notes'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(key === 'category' ? updates[key].toLowerCase() : updates[key]);
    }
  }

  if (fields.length === 0) throw createError('No updatable fields provided.', 400);

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`
    UPDATE financial_records SET ${fields.join(', ')} WHERE id = ?
  `).run(...params);

  return getRecordById(id);
}

/**
 * Soft-delete a record. Admins only.
 */
function deleteRecord(id) {
  getRecordById(id); // throws 404 if not found or already deleted

  db.prepare(`
    UPDATE financial_records
    SET is_deleted = 1, updated_at = datetime('now')
    WHERE id = ?
  `).run(id);

  return { message: 'Record deleted successfully.' };
}

module.exports = { createRecord, getRecordById, listRecords, updateRecord, deleteRecord };
