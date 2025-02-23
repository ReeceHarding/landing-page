import { Redis } from '@upstash/redis';
import { kv } from '@vercel/kv';

// Configure Redis client with better error handling
const getRedisClient = () => {
  // Use Vercel KV if credentials are provided
  if (process.env.KV_URL && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    console.log('Using Vercel KV for Redis storage');
    return kv;
  }

  // Fallback to Upstash Redis for development or alternative deployment
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('Using Upstash Redis for storage');
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  // Development fallback with warning
  console.warn('No Redis credentials found. Using development fallback. Data will not persist.');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || 'https://example.upstash.io',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || 'development_token',
  });
};

// Export the Redis client with error handling wrapper
const client = getRedisClient();

export const redis = {
  get: async (key: string) => {
    try {
      console.log(`[Redis] Getting key: ${key}`);
      const data = await client.get(key);
      console.log(`[Redis] Get result for ${key}:`, {
        hasData: Boolean(data),
        dataType: typeof data,
        valuePreview: data ? JSON.stringify(data).slice(0, 100) + '...' : null
      });
      return data;
    } catch (error) {
      console.error('[Redis] Get error:', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to fetch data from Redis for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
  set: async (key: string, value: any, options?: any) => {
    try {
      console.log(`[Redis] Setting key: ${key}`, {
        valueType: typeof value,
        hasValue: Boolean(value),
        options
      });
      const result = await client.set(key, value, options);
      console.log(`[Redis] Set result for ${key}:`, { success: Boolean(result) });

      // Verify the data was stored correctly
      const verification = await client.get(key);
      const originalValue = typeof value === 'string' ? value : JSON.stringify(value);
      const verificationValue = typeof verification === 'string' ? verification : JSON.stringify(verification);

      console.log(`[Redis] Verification for ${key}:`, {
        stored: Boolean(verification),
        matches: originalValue === verificationValue,
        originalLength: originalValue.length,
        verificationLength: verificationValue.length
      });

      if (!verification || originalValue !== verificationValue) {
        throw new Error(`Data verification failed for key ${key}`);
      }

      return result;
    } catch (error) {
      console.error('[Redis] Set error:', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to store data in Redis for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
}; 