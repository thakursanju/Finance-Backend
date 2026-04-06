/**
 * Express Application Entry Point
 * Wires together all middleware, routes, and the DB layer.
 */

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');

const { PORT, NODE_ENV } = require('./config');
const { initializeSchema, seedDefaultAdmin } = require('./db/schema');
const { errorHandler } = require('./middleware/errorHandler');
const { swaggerUi, swaggerDocument } = require('./docs/swagger');

// Route modules
const authRoutes      = require('./routes/auth');
const userRoutes      = require('./routes/users');
const recordRoutes    = require('./routes/records');
const dashboardRoutes = require('./routes/dashboard');

// ── Bootstrap DB ──────────────────────────────────────────────────────────────
initializeSchema();
seedDefaultAdmin();

// ── App Setup ─────────────────────────────────────────────────────────────────
const app = express();

// Security headers (relaxed CSP for Swagger UI)
app.use(helmet({ contentSecurityPolicy: false }));

// CORS – allow all origins in development
app.use(cors());

// Request logging
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API Documentation ─────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Finance API Docs',
  customCss: '.swagger-ui .topbar { display: none }',  // hide default Swagger topbar
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/records',   recordRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found.` });
});

// Central error handler (must be last)
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Finance API running at http://localhost:${PORT}`);
  console.log(`📚 API docs available at http://localhost:${PORT}/api-docs\n`);
});

module.exports = app; // exported for testing
