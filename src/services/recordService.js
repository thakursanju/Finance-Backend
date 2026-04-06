/**
 * Record Service (PostgreSQL version)
 */

const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/schema');
const { createError } = require('../middleware/errorHandler');

async function listRecords({
  type,
  category,
  fromDate,
  toDate,
  search,
  page = 1,
  limit = 20,
  sortBy = 'date',
  order = 'desc',
}) {
  const offset = (page - 1) * limit;
  let sql = 'SELECT * FROM financial_records WHERE is_deleted = FALSE';
  const params = [];

  if (type) {
    params.push(type);
    sql += ` AND type = $${params.length}`;
  }
  if (category) {
    params.push(category.toLowerCase());
    sql += ` AND LOWER(category) = $${params.length}`;
  }
  if (fromDate) {
    params.push(fromDate);
    sql += ` AND date >= $${params.length}`;
  }
  if (toDate) {
    params.push(toDate);
    sql += ` AND date <= $${params.length}`;
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    sql += ` AND (LOWER(notes) LIKE $${params.length} OR LOWER(category) LIKE $${params.length})`;
  }

  // Sorting (Sanitize manually since we can't use parameters for column names)
  const allowedSortFields = ['date', 'amount', 'category', 'type', 'created_at'];
  const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date';
  const finalOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  sql += ` ORDER BY ${finalSortBy} ${finalOrder} LIMIT ${limit} OFFSET ${offset}`;

  const { rows } = await query(sql, params);
  
  // Count total for pagination
  let countSql = 'SELECT COUNT(*) FROM financial_records WHERE is_deleted = FALSE';
  const countParams = [];
  // (Adding same filters to countSql...)
  if (type) { countParams.push(type); countSql += ` AND type = $${countParams.length}`; }
  if (category) { countParams.push(category.toLowerCase()); countSql += ` AND LOWER(category) = $${countParams.length}`; }
  if (fromDate) { countParams.push(fromDate); countSql += ` AND date >= $${countParams.length}`; }
  if (toDate) { countParams.push(toDate); countSql += ` AND date <= $${countParams.length}`; }
  if (search) { countParams.push(`%${search.toLowerCase()}%`); countSql += ` AND (LOWER(notes) LIKE $${countParams.length} OR LOWER(category) LIKE $${countParams.length})`; }

  const { rows: countResult } = await query(countSql, countParams);
  const total = parseInt(countResult[0].count, 10);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function createRecord(data, userId) {
  const { amount, type, category, date, notes } = data;
  const id = uuidv4();

  const { rows } = await query(`
    INSERT INTO financial_records (id, amount, type, category, date, notes, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [id, amount, type, category.toLowerCase(), date, notes, userId]);

  return rows[0];
}

async function getRecordById(id) {
  const { rows } = await query('SELECT * FROM financial_records WHERE id = $1 AND is_deleted = FALSE', [id]);
  if (rows.length === 0) throw createError('Record not found.', 404);
  return rows[0];
}

async function updateRecord(id, data) {
  const { amount, type, category, date, notes } = data;
  
  // Dynamic update logic
  const updates = [];
  const params = [id];
  let i = 2;

  if (amount !== undefined) { updates.push(`amount = $${i++}`); params.push(amount); }
  if (type !== undefined) { updates.push(`type = $${i++}`); params.push(type); }
  if (category !== undefined) { updates.push(`category = $${i++}`); params.push(category.toLowerCase()); }
  if (date !== undefined) { updates.push(`date = $${i++}`); params.push(date); }
  if (notes !== undefined) { updates.push(`notes = $${i++}`); params.push(notes); }
  
  updates.push(`updated_at = NOW()`);

  if (updates.length <= 1) return await getRecordById(id);

  const { rows } = await query(`
    UPDATE financial_records SET ${updates.join(', ')}
    WHERE id = $1 AND is_deleted = FALSE
    RETURNING *
  `, params);

  if (rows.length === 0) throw createError('Record not found.', 404);
  return rows[0];
}

async function deleteRecord(id) {
  const { rowCount } = await query(`
    UPDATE financial_records SET is_deleted = TRUE, updated_at = NOW()
    WHERE id = $1 AND is_deleted = FALSE
  `, [id]);

  if (rowCount === 0) throw createError('Record not found.', 404);
  return { message: 'Record soft-deleted.' };
}

module.exports = { listRecords, createRecord, getRecordById, updateRecord, deleteRecord };
