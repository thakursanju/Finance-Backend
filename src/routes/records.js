/**
 * Financial Records Routes
 *
 * GET    /api/records          – List records        (viewer, analyst, admin)
 * POST   /api/records          – Create record       (admin only)
 * GET    /api/records/:id      – Get single record   (viewer, analyst, admin)
 * PATCH  /api/records/:id      – Update record       (admin only)
 * DELETE /api/records/:id      – Soft-delete record  (admin only)
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
 *     tags: [Records]
 *     summary: List financial records with filters (Viewer+)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: type,     schema: { type: string, enum: [income, expense] } }
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: fromDate, schema: { type: string, example: "2024-01-01" } }
 *       - { in: query, name: toDate,   schema: { type: string, example: "2024-12-31" } }
 *       - { in: query, name: search,   schema: { type: string } }
 *       - { in: query, name: page,     schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit,    schema: { type: integer, default: 20 } }
 *       - { in: query, name: sortBy,   schema: { type: string, default: date } }
 *       - { in: query, name: order,    schema: { type: string, enum: [asc, desc], default: desc } }
 *     responses:
 *       200:
 *         description: Paginated list of records
 */
router.get('/', requireViewer, validate(ListRecordsQuerySchema, 'query'), (req, res, next) => {
  try {
    const result = recordService.listRecords(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/records:
 *   post:
 *     tags: [Records]
 *     summary: Create a financial record (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount:   { type: number,  example: 1500.00 }
 *               type:     { type: string,  enum: [income, expense] }
 *               category: { type: string,  example: salary }
 *               date:     { type: string,  example: "2024-03-15" }
 *               notes:    { type: string,  example: "Monthly salary" }
 *     responses:
 *       201:
 *         description: Record created
 */
router.post('/', requireAdmin, validate(CreateRecordSchema), (req, res, next) => {
  try {
    const record = recordService.createRecord(req.body, req.user.id);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/records/{id}:
 *   get:
 *     tags: [Records]
 *     summary: Get a single financial record (Viewer+)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', requireViewer, (req, res, next) => {
  try {
    const record = recordService.getRecordById(req.params.id);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/records/{id}:
 *   patch:
 *     tags: [Records]
 *     summary: Update a financial record (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', requireAdmin, validate(UpdateRecordSchema), (req, res, next) => {
  try {
    const record = recordService.updateRecord(req.params.id, req.body);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/records/{id}:
 *   delete:
 *     tags: [Records]
 *     summary: Soft-delete a financial record (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', requireAdmin, (req, res, next) => {
  try {
    const result = recordService.deleteRecord(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
