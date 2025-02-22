import { Redis } from '@upstash/redis';
import { kv } from '@vercel/kv';

function logRedisConfig(stage: string, details: any) {
  console.log(`[Redis Config ${stage}]`, {
    timestamp: new Date().toISOString(),
    runtime: typeof process.env.NEXT_RUNTIME === 'string' ? process.env.NEXT_RUNTIME : 'node',
    stage,
    ...details
  });
}

// Configure Redis client with fallback
const getRedisClient = () => {
  logRedisConfig('init', {
    hasKVCredentials: !!(process.env.KV_URL && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
    hasUpstashCredentials: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    env: process.env.NODE_ENV
  });

  try {
    // Use Vercel KV if credentials are provided
    if (process.env.KV_URL && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      logRedisConfig('using-vercel-kv', {});
      return kv;
    }

    // Use Upstash Redis
    logRedisConfig('using-upstash', {
      url: process.env.UPSTASH_REDIS_REST_URL
    });

    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  } catch (error) {
    logRedisConfig('error', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
};

// Export the Redis client
export const redis = getRedisClient(); 