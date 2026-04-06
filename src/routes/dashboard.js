/**
 * Dashboard Routes  (Analyst & Admin)
 *
 * GET /api/dashboard/summary           – Total income, expenses, net balance
 * GET /api/dashboard/categories        – Category-wise breakdown
 * GET /api/dashboard/trends/monthly    – Monthly income vs expense trend
 * GET /api/dashboard/trends/weekly     – Weekly income vs expense trend
 * GET /api/dashboard/recent            – Recent financial activity
 */

const express = require('express');
const router = express.Router();

const { authenticate }    = require('../middleware/auth');
const { requireAnalyst }  = require('../middleware/rbac');
const { validate }        = require('../middleware/validate');
const dashboardService    = require('../services/dashboardService');
const { TrendQuerySchema } = require('../schemas');

// All dashboard routes require analyst or higher
router.use(authenticate, requireAnalyst);

/**
 * @openapi
 * /api/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Overall financial summary (Analyst+)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary with totalIncome, totalExpenses, netBalance
 */
router.get('/summary', (req, res, next) => {
  try {
    const data = dashboardService.getSummary();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/dashboard/categories:
 *   get:
 *     tags: [Dashboard]
 *     summary: Category-wise income and expense breakdown (Analyst+)
 *     security:
 *       - bearerAuth: []
 */
router.get('/categories', (req, res, next) => {
  try {
    const data = dashboardService.getCategoryBreakdown();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/dashboard/trends/monthly:
 *   get:
 *     tags: [Dashboard]
 *     summary: Monthly income vs expense trend (Analyst+)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: months, schema: { type: integer, default: 12 } }
 */
router.get('/trends/monthly', validate(TrendQuerySchema, 'query'), (req, res, next) => {
  try {
    const data = dashboardService.getMonthlyTrend(req.query.months);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/dashboard/trends/weekly:
 *   get:
 *     tags: [Dashboard]
 *     summary: Weekly income vs expense trend (Analyst+)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: weeks, schema: { type: integer, default: 8 } }
 */
router.get('/trends/weekly', validate(TrendQuerySchema, 'query'), (req, res, next) => {
  try {
    const data = dashboardService.getWeeklyTrend(req.query.weeks);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/dashboard/recent:
 *   get:
 *     tags: [Dashboard]
 *     summary: Recent financial activity (Analyst+)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 */
router.get('/recent', (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const data  = dashboardService.getRecentActivity(limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
