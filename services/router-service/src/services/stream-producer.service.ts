import { logger } from '../utils/logger';

export async function publishToChannel(stream: string, payload: any) {
  logger.debug({ stream, payload }, 'publishToChannel');
}
