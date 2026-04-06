/**
 * Auth Routes
 * POST /api/auth/register  – Public self-registration (creates 'viewer' by default)
 * POST /api/auth/login     – Returns JWT
 * GET  /api/auth/me        – Returns current user profile (authenticated)
 */

const express = require('express');
const router = express.Router();

const { validate }     = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const authService      = require('../services/authService');
const { RegisterSchema, LoginSchema } = require('../schemas');

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user (viewer role by default)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string, example: johndoe }
 *               email:    { type: string, example: john@example.com }
 *               password: { type: string, example: "Secret@123" }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Username or email already in use
 *       422:
 *         description: Validation error
 */
router.post('/register', validate(RegisterSchema), (req, res, next) => {
  try {
    // Public registration is always 'viewer'. Admins use POST /users to set roles.
    const { role, ...rest } = req.body;
    const user = authService.register({ ...rest, role: 'viewer' });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate and receive a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(LoginSchema), (req, res, next) => {
  try {
    const result = authService.login(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticate, (req, res, next) => {
  try {
    const user = authService.getUserById(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
