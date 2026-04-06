/**
 * Zod Validation Schemas
 * Centralised in one file so they can be reused across routes and tests.
 */

const { z } = require('zod');

// ── Auth ──────────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['viewer', 'analyst', 'admin']).optional(),
});

const LoginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Users ────────────────────────────────────────────────────────────────────

const UpdateUserSchema = z.object({
  role:   z.enum(['viewer', 'analyst', 'admin']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
}).refine(data => data.role !== undefined || data.status !== undefined, {
  message: 'At least one of role or status must be provided.',
});

const ListUsersQuerySchema = z.object({
  role:   z.enum(['viewer', 'analyst', 'admin']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

// ── Financial Records ─────────────────────────────────────────────────────────

const CreateRecordSchema = z.object({
  amount:   z.number().positive('Amount must be a positive number'),
  type:     z.enum(['income', 'expense']),
  category: z.string().min(1, 'Category is required').max(100),
  date:     z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must be in YYYY-MM-DD format'
  ),
  notes:    z.string().max(500).optional(),
});

const UpdateRecordSchema = z.object({
  amount:   z.number().positive('Amount must be a positive number').optional(),
  type:     z.enum(['income', 'expense']).optional(),
  category: z.string().min(1).max(100).optional(),
  date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  notes:    z.string().max(500).nullable().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update.',
});

const ListRecordsQuerySchema = z.object({
  type:     z.enum(['income', 'expense']).optional(),
  category: z.string().optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search:   z.string().optional(),
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  sortBy:   z.enum(['date', 'amount', 'category', 'type', 'created_at']).default('date'),
  order:    z.enum(['asc', 'desc']).default('desc'),
});

// ── Dashboard query params ────────────────────────────────────────────────────

const TrendQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(60).default(12),
  weeks:  z.coerce.number().int().min(1).max(52).default(8),
});

module.exports = {
  RegisterSchema,
  LoginSchema,
  UpdateUserSchema,
  ListUsersQuerySchema,
  CreateRecordSchema,
  UpdateRecordSchema,
  ListRecordsQuerySchema,
  TrendQuerySchema,
};
