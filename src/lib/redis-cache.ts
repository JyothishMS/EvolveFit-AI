import Redis from 'redis';

// Redis client configuration
let redisClient: Redis.RedisClientType | null = null;

const CACHE_TTL = {
  EXERCISE_DATA: 3600, // 1 hour
  USER_ANALYSIS: 1800, // 30 minutes
  WORKOUT_PLAN: 86400, // 24 hours
  SHORT: 300, // 5 minutes
};

export async function initRedis() {
  if (redisClient) return redisClient;

  try {
    redisClient = Redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (options) => {
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      },
    });

    redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err));
    redisClient.on('connect', () => console.log('✅ Redis Connected'));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    return null;
  }
}

export async function cacheGet(key: string) {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ Cache get error:', error);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: any,
  ttl: number = CACHE_TTL.SHORT
) {
  if (!redisClient) return false;
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('❌ Cache set error:', error);
    return false;
  }
}

export async function cacheDel(key: string) {
  if (!redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('❌ Cache delete error:', error);
    return false;
  }
}

export async function cacheInvalidatePattern(pattern: string) {
  if (!redisClient) return 0;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return keys.length;
  } catch (error) {
    console.error('❌ Cache invalidate error:', error);
    return 0;
  }
}

// Cache key generators
export const cacheKeys = {
  analysis: (userId: string) => `analysis:${userId}`,
  plan: (userId: string) => `plan:${userId}`,
  exerciseData: (id: string) => `exercise:${id}`,
  userStats: (userId: string) => `stats:${userId}`,
  coachResponse: (userId: string, query: string) => `coach:${userId}:${query.slice(0, 20)}`,
};

export { CACHE_TTL };
