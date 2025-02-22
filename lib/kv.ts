import { Redis } from '@upstash/redis';
import { kv } from '@vercel/kv';

// Configure Redis client with fallback
const getRedisClient = () => {
  // Use Vercel KV if credentials are provided
  if (process.env.KV_URL && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return kv;
  }

  // Fallback to Upstash Redis for development or alternative deployment
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  // Development fallback using Upstash Redis
  return new Redis({
    url: 'https://example.upstash.io',
    token: 'development_token',
  });
};

// Export the Redis client
export const redis = getRedisClient(); 