// Minimal runtime validation example (expand as needed)
import Joi from 'joi';

export const notificationSchema = Joi.object({
  tenantId: Joi.string().required(),
  channel: Joi.string().valid('email', 'sms', 'push').required(),
  recipients: Joi.array().items(Joi.string()).min(1).required(),
  payload: Joi.object().required(),
  meta: Joi.object().optional(),
  scheduleAt: Joi.string().isoDate().optional(),
});

export default notificationSchema;
