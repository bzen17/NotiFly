import { logger } from '../utils/logger';

export async function publishToChannel(stream: string, payload: any) {
  // Publish to downstream streams (email/sms)
  logger.debug({ stream, payload }, 'publishToChannel');
}
