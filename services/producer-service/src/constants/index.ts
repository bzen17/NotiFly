/**
 * Shared constants for producer-service.
 * Keep descriptive names for errors, roles and jwt defaults.
 */
export const ERRORS = {
  EMAIL_PASSWORD_NAME_REQUIRED: 'email_password_name_required',
  EMAIL_AND_PASSWORD_REQUIRED: 'email_and_password_required',
  USER_EXISTS: 'user_exists',
  INVALID_CREDENTIALS: 'invalid_credentials',
  REFRESH_REQUIRED: 'refresh_required',
  INVALID_REFRESH: 'invalid_refresh',
  FORBIDDEN: 'forbidden',
  VALIDATION_ERROR: 'validation_error',
  INTERNAL_ERROR: 'internal_error',
  NOT_FOUND: 'not_found',
  LOCKED: 'locked',
};

export const ROLES = {
  ADMIN: 'admin',
  TENANT: 'tenant',
};

export const JWT_DEFAULTS = {
  ACCESS_EXP: process.env.JWT_ACCESS_EXP || '15m',
  REFRESH_EXP: process.env.JWT_REFRESH_EXP || '7d',
};

export const STREAMS = {
  INCOMING: 'notifications.incoming',
  DLQ: 'notifications.dlq',
};

export const STATUS = {
  QUEUED: 'queued',
  // 'delivered' is the canonical DB value for successful deliveries
  DELIVERED: 'delivered',
  // alias for older code expecting 'sent'
  SENT: 'delivered',
  REQUEUED: 'requeued',
  FAILED: 'failed',
};

export const AGGREGATE_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED',
};

export default { ERRORS, ROLES, JWT_DEFAULTS, STREAMS, STATUS, AGGREGATE_STATUS };
