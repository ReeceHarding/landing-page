import { Redis } from '@upstash/redis';
import { kv } from '@vercel/kv';

interface RedisClientInterface {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any, options?: any) => Promise<any>;
}

// Create a singleton instance
let redisClient: RedisClientInterface | null = null;

// Configure Redis client with better error handling
export function getRedisClient(): RedisClientInterface {
  if (redisClient) {
    return redisClient;
  }

  // Use Vercel KV if credentials are provided
  if (process.env.KV_URL || process.env.KV_REST_API_URL || process.env.KV_REST_API_TOKEN) {
    console.log('Using Vercel KV for Redis storage');
    redisClient = {
      get: async (key: string) => {
        try {
          return await kv.get(key);
        } catch (error) {
          console.error('Vercel KV get error:', error);
          throw error;
        }
      },
      set: async (key: string, value: any, options?: any) => {
        try {
          return await kv.set(key, value, options);
        } catch (error) {
          console.error('Vercel KV set error:', error);
          throw error;
        }
      }
    };
    return redisClient;
  }

  // Fallback to Upstash Redis for development or alternative deployment
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('Using Upstash Redis for storage');
    const client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    redisClient = {
      get: async (key: string) => {
        try {
          return await client.get(key);
        } catch (error) {
          console.error('Upstash Redis get error:', error);
          throw error;
        }
      },
      set: async (key: string, value: any, options?: any) => {
        try {
          return await client.set(key, value, options);
        } catch (error) {
          console.error('Upstash Redis set error:', error);
          throw error;
        }
      }
    };
    return redisClient;
  }

  // Development fallback with warning
  console.warn('No Redis credentials found. Using development fallback. Data will not persist.');
  const fallbackClient = new Redis({
    url: 'https://example.upstash.io',
    token: 'development_token',
  });

  redisClient = {
    get: async (key: string) => {
      try {
        return await fallbackClient.get(key);
      } catch (error) {
        console.error('Fallback Redis get error:', error);
        throw error;
      }
    },
    set: async (key: string, value: any, options?: any) => {
      try {
        return await fallbackClient.set(key, value, options);
      } catch (error) {
        console.error('Fallback Redis set error:', error);
        throw error;
      }
    }
  };
  return redisClient;
}

// Export the type
export type RedisClient = ReturnType<typeof getRedisClient>;

// Export a function to get the Redis client
export const redis = getRedisClient(); 