/**
 * Error Handler Middleware
 * Central catch-all for any unhandled errors thrown by route handlers.
 * Differentiates between operational and unexpected errors.
 */

function errorHandler(err, req, res, next) {
  // Avoid logging expected client errors (4xx)
  if (!err.status || err.status >= 500) {
    console.error('[ERROR]', err.message, err.stack);
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected error occurred.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Helper to create operational HTTP errors with a specific status code.
 * @param {string} message
 * @param {number} status
 */
function createError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { errorHandler, createError };
