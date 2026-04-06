/**
 * Application Configuration
 * Centralizes all environment variables and their defaults.
 * Fail fast if critical values are missing in production.
 */

require('dotenv').config();

const config = {
  PORT:        parseInt(process.env.PORT || '3000', 10),
  NODE_ENV:    process.env.NODE_ENV || 'development',
  JWT_SECRET:  process.env.JWT_SECRET || 'finance-secret-dev-key-change-in-production',
  JWT_EXPIRES: process.env.JWT_EXPIRES || '24h',
};

if (config.NODE_ENV === 'production' && config.JWT_SECRET.includes('dev')) {
  throw new Error('Set a strong JWT_SECRET in production!');
}

module.exports = config;
