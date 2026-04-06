# Finance Data Processing & Access Control Backend

A production-ready RESTful API backend for a finance dashboard system, featuring role-based access control (RBAC), financial record management, and aggregated analytics.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Role System](#role-system)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Design Decisions & Assumptions](#design-decisions--assumptions)
- [Project Structure](#project-structure)

---

## Tech Stack

| Layer          | Technology                                  |
|----------------|---------------------------------------------|
| Runtime        | Node.js v18+                                |
| Framework      | Express.js v5                               |
| Database       | SQLite via `better-sqlite3` (synchronous)   |
| Authentication | JSON Web Tokens (`jsonwebtoken`)            |
| Passwords      | `bcryptjs` (10 salt rounds)                 |
| Validation     | `zod` (schema-first, with transform)        |
| Security       | `helmet`, `cors`                            |
| Logging        | `morgan` (dev format in development)        |
| API Docs       | `swagger-ui-express` (OpenAPI 3.0)          |

**Why SQLite?** It requires zero configuration, has no separate server process, and is more than sufficient for this scope. The `better-sqlite3` driver is synchronous, which works naturally with Express.js and avoids unnecessary async complexity.

---

## Architecture Overview

```
src/
├── app.js              # Express app entry point (server bootstrap, route mounting)
├── config.js           # Centralized environment config
├── db/
│   └── schema.js       # SQLite schema, DB connection, seeding
├── middleware/
│   ├── auth.js         # JWT verification (authenticate)
│   ├── rbac.js         # Role-based access control (authorize, requireAdmin, etc.)
│   ├── validate.js     # Zod validation middleware factory
│   └── errorHandler.js # Central error handler + createError helper
├── routes/
│   ├── auth.js         # POST /register, POST /login, GET /me
│   ├── users.js        # CRUD /users (admin only)
│   ├── records.js      # CRUD /records (viewer can read, admin can write)
│   └── dashboard.js    # Analytics /dashboard/* (analyst+)
├── services/
│   ├── authService.js      # Registration, login logic
│   ├── userService.js      # User CRUD, pagination
│   ├── recordService.js    # Financial record CRUD, filtering, soft-delete
│   └── dashboardService.js # Aggregation queries (summary, trends, categories)
├── schemas/
│   └── index.js        # All Zod schemas (reusable, centralized)
└── docs/
    └── swagger.js      # OpenAPI 3.0 spec for Swagger UI
```

**Separation of Concerns:** Routes are kept thin — they only handle HTTP concerns (request parsing, response formatting). All business logic lives in service modules. The database layer is isolated in `db/schema.js`.

---

## Role System

| Role     | Records (Read) | Records (Write/Delete) | Dashboard/Analytics | User Management |
|----------|:--------------:|:----------------------:|:-------------------:|:---------------:|
| viewer   | ✅             | ❌                     | ❌                  | ❌              |
| analyst  | ✅             | ❌                     | ✅                  | ❌              |
| admin    | ✅             | ✅                     | ✅                  | ✅              |

RBAC is implemented as Express middleware in `src/middleware/rbac.js`. Each route explicitly declares which roles can access it — there is no implicit permission inheritance via configuration.

---

## Quick Start

### 1. Prerequisites

- Node.js v18 or higher
- npm

### 2. Install Dependencies

```bash
cd finance-backend
npm install
```

### 3. Configure Environment

```bash
copy .env.example .env
```

Edit `.env` if needed (defaults work fine for local development).

### 4. Seed the Database

```bash
npm run seed
```

This will:
- Create the SQLite database at `data/finance.db`
- Seed a default admin account
- Create test analyst and viewer accounts
- Insert 60 sample financial records across 12 months

**Test accounts:**

| Role    | Email                  | Password   |
|---------|------------------------|------------|
| Admin   | admin@finance.local    | Admin@123  |
| Analyst | alice@finance.local    | Alice@123  |
| Viewer  | bob@finance.local      | Bob@12345  |

### 5. Start the Server

```bash
npm run dev       # Development (auto-restart with nodemon)
npm start         # Production
```

Server runs at: **http://localhost:3000**

### 6. Explore the API

Open **http://localhost:3000/api-docs** in your browser for the full interactive Swagger UI.

1. Click **POST /api/auth/login**, try it, paste your credentials
2. Copy the token from the response
3. Click **Authorize** (top right) and enter the token
4. Explore all endpoints

---

## API Reference

### Base URL: `http://localhost:3000`

### Authentication

All protected endpoints require: `Authorization: Bearer <token>`

---

### Auth Endpoints

| Method | Endpoint          | Access  | Description                      |
|--------|-------------------|---------|----------------------------------|
| POST   | /api/auth/register| Public  | Register (always gets viewer role)|
| POST   | /api/auth/login   | Public  | Login, returns JWT               |
| GET    | /api/auth/me      | Any     | Get current user profile          |

**Login Example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@finance.local", "password": "Admin@123"}'
```

---

### User Management Endpoints (Admin only)

| Method | Endpoint        | Description                    |
|--------|-----------------|--------------------------------|
| GET    | /api/users      | List users (filter by role/status, paginated) |
| POST   | /api/users      | Create user with any role      |
| GET    | /api/users/:id  | Get user by ID                 |
| PATCH  | /api/users/:id  | Update role or status          |
| DELETE | /api/users/:id  | Delete user permanently        |

**Query params for GET /api/users:**
- `role` — filter by role (viewer/analyst/admin)
- `status` — filter by status (active/inactive)
- `page`, `limit` — pagination (default: page=1, limit=20)

---

### Financial Records Endpoints

| Method | Endpoint          | Access           | Description              |
|--------|-------------------|------------------|--------------------------|
| GET    | /api/records      | Viewer+          | List records (filterable, paginated) |
| POST   | /api/records      | Admin            | Create record            |
| GET    | /api/records/:id  | Viewer+          | Get single record        |
| PATCH  | /api/records/:id  | Admin            | Update record            |
| DELETE | /api/records/:id  | Admin            | Soft-delete record       |

**Query params for GET /api/records:**
- `type` — `income` or `expense`
- `category` — filter by category name (case-insensitive)
- `fromDate`, `toDate` — date range in `YYYY-MM-DD` format
- `search` — full-text search in notes and category
- `page`, `limit` — pagination
- `sortBy` — field to sort by (date, amount, category, type, created_at)
- `order` — `asc` or `desc` (default: `desc`)

---

### Dashboard / Analytics Endpoints (Analyst+)

| Method | Endpoint                       | Description                     |
|--------|--------------------------------|---------------------------------|
| GET    | /api/dashboard/summary         | Total income, expenses, net balance |
| GET    | /api/dashboard/categories      | Category-wise income and expense totals |
| GET    | /api/dashboard/trends/monthly  | Monthly trend (last N months)   |
| GET    | /api/dashboard/trends/weekly   | Weekly trend (last N weeks)     |
| GET    | /api/dashboard/recent          | Recent N financial records      |

**Example summary response:**
```json
{
  "success": true,
  "data": {
    "totalIncome": 85000.00,
    "totalExpenses": 32500.00,
    "netBalance": 52500.00
  }
}
```

---

### Standard Response Format

All endpoints return a consistent envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Paginated list
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 60, "totalPages": 3 } }

// Error
{ "success": false, "error": "Descriptive message" }

// Validation error
{ "success": false, "error": "Validation failed.", "details": [{ "field": "amount", "message": "..." }] }
```

### HTTP Status Codes

| Code | Meaning                          |
|------|----------------------------------|
| 200  | Success                          |
| 201  | Resource created                 |
| 400  | Bad request / invalid operation  |
| 401  | Not authenticated                |
| 403  | Forbidden (insufficient role)    |
| 404  | Resource not found               |
| 409  | Conflict (duplicate email/username) |
| 422  | Validation error                 |
| 500  | Internal server error            |

---

## Design Decisions & Assumptions

### Soft Delete
Financial records are soft-deleted (`is_deleted = 1`) rather than permanently removed. This preserves audit history and prevents data loss from accidental deletes. A future "deleted records" endpoint or restore functionality can be added without schema changes.

### Public Registration → Viewer Only
`POST /api/auth/register` is public and always creates a `viewer`. Only admins can create users with elevated roles via `POST /api/users`. This prevents privilege escalation through self-registration.

### Synchronous SQLite
`better-sqlite3` uses synchronous I/O. This is a deliberate choice: Express.js is single-threaded, and synchronous SQLite is simpler, faster for small-to-medium workloads, and eliminates async/await boilerplate in service functions. For high concurrency, a PostgreSQL adapter could be swapped in without changing the service layer structure.

### No Refresh Tokens
JWTs are valid for 24 hours (configurable via `JWT_EXPIRES`). Refresh token rotation was omitted to keep the scope focused. The token expiry and secret are environment-configurable for production use.

### Category Normalization
Categories are stored lowercase (`.toLowerCase()`) to prevent duplicates like "Salary" and "salary" from creating separate analytics buckets.

### Input Validation
Zod schemas handle all input validation at the HTTP boundary. Schema definitions are centralized in `src/schemas/index.js` to avoid duplication and make contract changes easy. Validated data is passed to service functions, which can trust the inputs are correctly typed.

### Admin Self-Protection
Admins cannot:
- Deactivate their own account
- Delete their own account

This prevents accidental lockout.

---

## Health Check

```bash
GET /health
```

Returns server status, timestamp, and environment. Useful for load balancers and uptime monitors.
