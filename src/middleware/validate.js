/**
 * Validation Middleware Factory
 *
 * Wraps a Zod schema and validates req.body (or req.query / req.params).
 * On failure it returns a 422 with a structured list of field errors.
 *
 * Usage:
 *   router.post('/path', validate(MySchema), handler)
 *   router.get('/path',  validate(MySchema, 'query'), handler)
 */

const { ZodError } = require('zod');

/**
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'query'|'params'} source  - Which part of the request to validate
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      // Zod v4 uses `issues`; Zod v3 used `errors` — support both
      const issues = result.error.issues || result.error.errors || [];
      const errors = issues.map((e) => ({
        field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
        message: e.message,
      }));
      return res.status(422).json({
        success: false,
        error: 'Validation failed.',
        details: errors,
      });
    }
    // Replace the source with the parsed (and potentially transformed) value
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
