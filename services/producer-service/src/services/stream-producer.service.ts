import { getRedis } from '../config/db';
import logger from '../utils/logger';

export async function publishToStream(streamName: string, payload: any) {
  // Publish a message to a Redis Stream using XADD. Accepts an object payload which
  // will be stored under the `payload` field as a JSON string. Tries to support
  // both node-redis v4 (`xAdd`) and older clients exposing `xadd`.
  const redis = await getRedis();

  const fields = { payload: JSON.stringify(payload) };

  if (typeof redis.xAdd === 'function') {
    logger.debug({ streamName }, 'Using redis.xAdd to publish payload');
    return redis.xAdd(streamName, '*', fields);
  }

  if (typeof (redis as any).xadd === 'function') {
    const flat = Object.entries(fields).flat();
    logger.debug({ streamName }, 'Using legacy redis.xadd to publish payload');
    return (redis as any).xadd(streamName, '*', ...flat);
  }

  // Fallback: try PUB/SUB publish
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

  throw new Error('Redis client does not support XADD or PUBLISH; cannot publish to stream');
}

export default { publishToStream };
