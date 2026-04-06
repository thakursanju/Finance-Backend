const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAnalyst } = require('../middleware/rbac');
const dashboardService = require('../services/dashboardService');

router.use(authenticate, requireAnalyst);

router.get('/summary', async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardSummary();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/categories', async (req, res, next) => {
  try {
    const data = await dashboardService.getCategoryBreakdown();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/trends/monthly', async (req, res, next) => {
  try {
    const data = await dashboardService.getMonthlyTrends(req.query.months);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/recent', async (req, res, next) => {
  try {
    const data = await dashboardService.getRecentRecords(req.query.limit);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
