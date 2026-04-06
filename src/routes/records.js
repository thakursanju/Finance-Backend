/**
 * Financial Records Routes (PostgreSQL Async Version)
 */

const express = require('express');
const router = express.Router();

const { authenticate }   = require('../middleware/auth');
const { requireAdmin, requireViewer } = require('../middleware/rbac');
const { validate }       = require('../middleware/validate');
const recordService      = require('../services/recordService');
const {
  CreateRecordSchema,
  UpdateRecordSchema,
  ListRecordsQuerySchema,
} = require('../schemas');

// All record routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/records:
 *   get:
 */
router.get('/', requireViewer, validate(ListRecordsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const result = await recordService.listRecords(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/records:
 *   post:
 */
router.post('/', requireAdmin, validate(CreateRecordSchema), async (req, res, next) => {
  try {
    const record = await recordService.createRecord(req.body, req.user.id);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/records/{id}:
 *   get:
 */
router.get('/:id', requireViewer, async (req, res, next) => {
  try {
    const record = await recordService.getRecordById(req.params.id);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/records/{id}:
 *   patch:
 */
router.patch('/:id', requireAdmin, validate(UpdateRecordSchema), async (req, res, next) => {
  try {
    const record = await recordService.updateRecord(req.params.id, req.body);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/records/{id}:
 *   delete:
 */
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const result = await recordService.deleteRecord(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
