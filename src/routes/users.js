/**
 * User Management Routes  (Admin only)
 *
 * GET    /api/users          – List all users (admin)
 * POST   /api/users          – Create user with any role (admin)
 * GET    /api/users/:id      – Get user by ID (admin)
 * PATCH  /api/users/:id      – Update role/status (admin)
 * DELETE /api/users/:id      – Delete user (admin)
 */

const express = require('express');
const router = express.Router();

const { authenticate }  = require('../middleware/auth');
const { requireAdmin }  = require('../middleware/rbac');
const { validate }      = require('../middleware/validate');
const userService       = require('../services/userService');
const authService       = require('../services/authService');
const {
  RegisterSchema,
  UpdateUserSchema,
  ListUsersQuerySchema,
} = require('../schemas');

// All user management routes require authentication + admin role
router.use(authenticate, requireAdmin);

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List users (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [viewer, analyst, admin] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated user list
 */
router.get('/', validate(ListUsersQuerySchema, 'query'), (req, res, next) => {
  try {
    const result = userService.listUsers(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create a user with a specific role (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.post('/', validate(RegisterSchema), (req, res, next) => {
  try {
    const user = authService.register(req.body); // admin can set any role
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a single user (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', (req, res, next) => {
  try {
    const user = userService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user's role or status (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', validate(UpdateUserSchema), (req, res, next) => {
  try {
    const user = userService.updateUser(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', (req, res, next) => {
  try {
    const result = userService.deleteUser(req.params.id, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
