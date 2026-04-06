/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Role hierarchy (lowest → highest privilege):
 *   viewer  → can only READ dashboard / records
 *   analyst → can READ records + access insights/summaries
 *   admin   → full CRUD on records + user management
 *
 * Usage:
 *   router.post('/records', authenticate, authorize('admin'), handler)
 *   router.get('/records', authenticate, authorize('viewer', 'analyst', 'admin'), handler)
 *
 * Helpers:
 *   requireAdmin    – shorthand for authorize('admin')
 *   requireAnalyst  – shorthand for authorize('analyst', 'admin')
 *   requireViewer   – any authenticated user (all roles)
 */

/**
 * Returns a middleware that allows only users whose role is in `allowedRoles`.
 * @param {...string} allowedRoles
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. This action requires one of: [${allowedRoles.join(', ')}].`,
      });
    }
    next();
  };
}

const requireAdmin   = authorize('admin');
const requireAnalyst = authorize('analyst', 'admin');
const requireViewer  = authorize('viewer', 'analyst', 'admin'); // any authenticated role

module.exports = { authorize, requireAdmin, requireAnalyst, requireViewer };
