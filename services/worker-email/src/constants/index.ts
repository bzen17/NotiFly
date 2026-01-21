/**
 * Shared constants for worker-email service.
 */
export const STATUS = {
  DELIVERED: 'delivered',
  FAILED: 'failed',
  REQUEUED: 'requeued',
};

export const ERRORS = {
  INTERNAL_ERROR: 'internal_error',
  FORBIDDEN: 'forbidden',
  LOCKED: 'locked',
};

export default { STATUS, ERRORS };
