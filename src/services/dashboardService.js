const { query } = require('../db/schema');

async function getDashboardSummary() {
  const { rows } = await query(`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
    FROM financial_records
    WHERE is_deleted = FALSE
  `);
  
  const summary = rows[0];
  return {
    totalIncome: parseFloat(summary.income),
    totalExpenses: parseFloat(summary.expense),
    netBalance: parseFloat(summary.income) - parseFloat(summary.expense)
  };
}

async function getCategoryBreakdown() {
  const { rows } = await query(`
    SELECT category, type, SUM(amount) as total
    FROM financial_records
    WHERE is_deleted = FALSE
    GROUP BY category, type
    ORDER BY total DESC
  `);
  
  return rows.map(r => ({
    category: r.category,
    type: r.type,
    total: parseFloat(r.total)
  }));
}

async function getMonthlyTrends(months = 6) {
  const { rows } = await query(`
    SELECT 
      TO_CHAR(date, 'YYYY-MM') as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
    FROM financial_records
    WHERE is_deleted = FALSE
    AND date >= CURRENT_DATE - INTERVAL '$1 months'
    GROUP BY month
    ORDER BY month ASC
  `, [months]);
  
  return rows.map(r => ({
    month: r.month,
    income: parseFloat(r.income),
    expense: parseFloat(r.expense)
  }));
}

async function getRecentRecords(limit = 10) {
  const { rows } = await query(`
    SELECT * FROM financial_records
    WHERE is_deleted = FALSE
    ORDER BY created_at DESC
    LIMIT $1
  `, [limit]);
  return rows;
}

module.exports = { 
  getDashboardSummary, 
  getCategoryBreakdown, 
  getMonthlyTrends, 
  getRecentRecords 
};
