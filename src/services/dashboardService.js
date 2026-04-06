/**
 * Dashboard / Analytics Service
 * All aggregation logic lives here, keeping routes thin.
 * Only queries non-deleted records.
 */

const { db } = require('../db/schema');

/**
 * High-level summary: total income, total expenses, net balance.
 */
function getSummary() {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS totalIncome,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS totalExpenses
    FROM financial_records
    WHERE is_deleted = 0
  `).get();

  return {
    totalIncome:   row.totalIncome,
    totalExpenses: row.totalExpenses,
    netBalance:    row.totalIncome - row.totalExpenses,
  };
}

/**
 * Category-wise totals (for both income and expense).
 */
function getCategoryBreakdown() {
  const rows = db.prepare(`
    SELECT
      category,
      type,
      COALESCE(SUM(amount), 0) AS total,
      COUNT(*) AS count
    FROM financial_records
    WHERE is_deleted = 0
    GROUP BY category, type
    ORDER BY total DESC
  `).all();

  // Group by type for easier frontend consumption
  const income  = rows.filter(r => r.type === 'income');
  const expense = rows.filter(r => r.type === 'expense');

  return { income, expense };
}

/**
 * Monthly trend: total income vs expenses grouped by YYYY-MM.
 * @param {number} months  How many past months to include (default 12)
 */
function getMonthlyTrend(months = 12) {
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', date) AS month,
      type,
      COALESCE(SUM(amount), 0) AS total
    FROM financial_records
    WHERE is_deleted = 0
      AND date >= date('now', ? || ' months')
    GROUP BY month, type
    ORDER BY month ASC
  `).all(`-${months}`);

  // Pivot into a map of month → { income, expense }
  const monthMap = {};
  for (const row of rows) {
    if (!monthMap[row.month]) monthMap[row.month] = { month: row.month, income: 0, expense: 0 };
    monthMap[row.month][row.type] = row.total;
  }

  return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Weekly trend: last N weeks of activity.
 * @param {number} weeks
 */
function getWeeklyTrend(weeks = 8) {
  const rows = db.prepare(`
    SELECT
      strftime('%Y-W%W', date) AS week,
      type,
      COALESCE(SUM(amount), 0) AS total
    FROM financial_records
    WHERE is_deleted = 0
      AND date >= date('now', ? || ' days')
    GROUP BY week, type
    ORDER BY week ASC
  `).all(`-${weeks * 7}`);

  const weekMap = {};
  for (const row of rows) {
    if (!weekMap[row.week]) weekMap[row.week] = { week: row.week, income: 0, expense: 0 };
    weekMap[row.week][row.type] = row.total;
  }

  return Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Recent activity: latest N records.
 * @param {number} limit
 */
function getRecentActivity(limit = 10) {
  return db.prepare(`
    SELECT id, amount, type, category, date, notes, created_at
    FROM financial_records
    WHERE is_deleted = 0
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);
}

module.exports = { getSummary, getCategoryBreakdown, getMonthlyTrend, getWeeklyTrend, getRecentActivity };
