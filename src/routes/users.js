const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const userService = require('../services/userService');
const { UpdateUserSchema, CreateUserSchema } = require('../schemas');

router.use(authenticate, requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const data = await userService.listUsers(req.query);
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await userService.getUserById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch('/:id', validate(UpdateUserSchema), async (req, res, next) => {
  try {
    const data = await userService.updateUser(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await userService.deleteUser(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

module.exports = router;
