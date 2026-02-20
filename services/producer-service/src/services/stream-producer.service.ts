import { getRedis } from '../config/db';
import logger from '../utils/logger';
import { STREAMS } from '../constants';

export async function publishToStream(streamName: string, payload: any) {
  const redis = await getRedis();

  const fields = { payload: JSON.stringify(payload) };

  try {
    logger.info({ streamName, payload }, 'Publishing payload to stream');
  } catch (e) {
    logger.warn({ err: e }, 'Failed to log publish attempt to stream');
  }

  if (typeof redis.xAdd === 'function') {
    logger.debug({ streamName }, 'Using redis.xAdd to publish payload');
    return redis.xAdd(streamName, '*', fields);
  }

  if (typeof (redis as any).xadd === 'function') {
    const flat = Object.entries(fields).flat();
    logger.debug({ streamName }, 'Using legacy redis.xadd to publish payload');
    return (redis as any).xadd(streamName, '*', ...flat);
  }

  if (typeof redis.publish === 'function') {
    try {
      await redis.publish(streamName, JSON.stringify(payload));
      logger.debug({ streamName }, 'Published payload via PUB/SUB fallback');
      return true;
    } catch (e) {
      logger.error({ err: e }, 'Failed to publish payload via PUB/SUB fallback');
      throw e;
    }
  }

  throw new Error(
    `Redis client does not support XADD or PUBLISH; cannot publish to stream ${streamName}`,
  );
}

export default { publishToStream };
