import { Redis } from "@upstash/redis";

// Upstash Redis client for idempotency keys and caching
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables"
      );
    }

    redis = new Redis({ url, token });
  }

  return redis;
}

// Optional: graceful fallback for dev without Redis
export function getRedisOptional(): Redis | null {
  try {
    return getRedis();
  } catch {
    console.warn("Redis not configured — idempotency features disabled");
    return null;
  }
}
