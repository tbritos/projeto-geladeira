import path from 'node:path';

export const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const DEFAULT_MIN_TEMP = Number.parseFloat(process.env.DEFAULT_MIN_TEMP ?? '2');
const DEFAULT_MAX_TEMP = Number.parseFloat(process.env.DEFAULT_MAX_TEMP ?? '8');

export const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'default';
export const FALLBACK_MIN_TEMP = Number.isFinite(DEFAULT_MIN_TEMP) ? DEFAULT_MIN_TEMP : 2;
export const FALLBACK_MAX_TEMP = Number.isFinite(DEFAULT_MAX_TEMP) ? DEFAULT_MAX_TEMP : 8;
export const AUDIT_LOG_PATH = path.join(process.cwd(), 'audit.log');
