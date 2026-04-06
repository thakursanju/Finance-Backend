/**
 * Swagger / OpenAPI Documentation Setup
 * Served at GET /api-docs
 */

const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Finance Dashboard API',
    version: '1.0.0',
    description: `
## Finance Data Processing & Access Control Backend

A RESTful API for managing financial records with role-based access control.

### Roles
| Role     | Capabilities                                              |
|----------|-----------------------------------------------------------|
| viewer   | Read financial records and own profile                    |
| analyst  | Read records + access all dashboard/analytics endpoints   |
| admin    | Full CRUD on records and users + all dashboard features   |

### Quick Start
1. Login with the default admin → \`POST /api/auth/login\`
   - email: \`admin@finance.local\`, password: \`Admin@123\`
2. Copy the token and click **Authorize** (top right)
3. Explore the endpoints below
    `,
    contact: { name: 'Finance API Support' },
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste your JWT token here (without "Bearer " prefix)',
      },
    },
  },
  tags: [
    { name: 'Auth',      description: 'Authentication – register, login, profile' },
    { name: 'Users',     description: 'User management (Admin only)'              },
    { name: 'Records',   description: 'Financial records CRUD'                    },
    { name: 'Dashboard', description: 'Aggregated analytics (Analyst+)'           },
  ],
  paths: {
    // ── Auth ──────────────────────────────────────────────────────────────────
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user (viewer role)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                  username: { type: 'string', example: 'johndoe' },
                  email:    { type: 'string', example: 'john@example.com' },
                  password: { type: 'string', example: 'Secret@123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User created' },
          409: { description: 'Username or email already in use' },
          422: { description: 'Validation error' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', example: 'admin@finance.local' },
                  password: { type: 'string', example: 'Admin@123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'JWT token and user info' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User profile' },
          401: { description: 'Not authenticated' },
        },
      },
    },
    // ── Users ──────────────────────────────────────────────────────────────────
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List all users (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'role',   schema: { type: 'string', enum: ['viewer','analyst','admin'] } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['active','inactive'] } },
          { in: 'query', name: 'page',   schema: { type: 'integer', default: 1  } },
          { in: 'query', name: 'limit',  schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Paginated user list' }, 403: { description: 'Forbidden' } },
      },
      post: {
        tags: ['Users'],
        summary: 'Create a user with a specific role (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                  username: { type: 'string' },
                  email:    { type: 'string' },
                  password: { type: 'string' },
                  role:     { type: 'string', enum: ['viewer','analyst','admin'], default: 'viewer' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'User created' }, 403: { description: 'Forbidden' } },
      },
    },
    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User data' }, 404: { description: 'Not found' } },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user role or status (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role:   { type: 'string', enum: ['viewer','analyst','admin'] },
                  status: { type: 'string', enum: ['active','inactive'] },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated user' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete a user (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User deleted' } },
      },
    },
    // ── Records ────────────────────────────────────────────────────────────────
    '/api/records': {
      get: {
        tags: ['Records'],
        summary: 'List financial records with filters (Viewer+)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'type',     schema: { type: 'string', enum: ['income','expense'] } },
          { in: 'query', name: 'category', schema: { type: 'string' } },
          { in: 'query', name: 'fromDate', schema: { type: 'string', example: '2024-01-01' } },
          { in: 'query', name: 'toDate',   schema: { type: 'string', example: '2024-12-31' } },
          { in: 'query', name: 'search',   schema: { type: 'string' } },
          { in: 'query', name: 'page',     schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit',    schema: { type: 'integer', default: 20 } },
          { in: 'query', name: 'sortBy',   schema: { type: 'string', default: 'date' } },
          { in: 'query', name: 'order',    schema: { type: 'string', enum: ['asc','desc'] } },
        ],
        responses: { 200: { description: 'Paginated records' } },
      },
      post: {
        tags: ['Records'],
        summary: 'Create a financial record (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'type', 'category', 'date'],
                properties: {
                  amount:   { type: 'number', example: 5000 },
                  type:     { type: 'string', enum: ['income','expense'] },
                  category: { type: 'string', example: 'salary' },
                  date:     { type: 'string', example: '2024-03-01' },
                  notes:    { type: 'string', example: 'March salary' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Record created' }, 403: { description: 'Forbidden' } },
      },
    },
    '/api/records/{id}': {
      get: {
        tags: ['Records'],
        summary: 'Get a single record (Viewer+)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Record data' }, 404: { description: 'Not found' } },
      },
      patch: {
        tags: ['Records'],
        summary: 'Update a financial record (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amount:   { type: 'number' },
                  type:     { type: 'string', enum: ['income','expense'] },
                  category: { type: 'string' },
                  date:     { type: 'string' },
                  notes:    { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated record' } },
      },
      delete: {
        tags: ['Records'],
        summary: 'Soft-delete a financial record (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Record deleted (soft)' } },
      },
    },
    // ── Dashboard ──────────────────────────────────────────────────────────────
    '/api/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Overall financial summary (Analyst+)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'totalIncome, totalExpenses, netBalance' } },
      },
    },
    '/api/dashboard/categories': {
      get: {
        tags: ['Dashboard'],
        summary: 'Category-wise breakdown (Analyst+)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Income and expense totals per category' } },
      },
    },
    '/api/dashboard/trends/monthly': {
      get: {
        tags: ['Dashboard'],
        summary: 'Monthly income vs expense trend (Analyst+)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'query', name: 'months', schema: { type: 'integer', default: 12 } }],
        responses: { 200: { description: 'Monthly trend data' } },
      },
    },
    '/api/dashboard/trends/weekly': {
      get: {
        tags: ['Dashboard'],
        summary: 'Weekly income vs expense trend (Analyst+)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'query', name: 'weeks', schema: { type: 'integer', default: 8 } }],
        responses: { 200: { description: 'Weekly trend data' } },
      },
    },
    '/api/dashboard/recent': {
      get: {
        tags: ['Dashboard'],
        summary: 'Recent financial activity (Analyst+)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } }],
        responses: { 200: { description: 'Latest N records' } },
      },
    },
  },
};

module.exports = { swaggerUi, swaggerDocument };
