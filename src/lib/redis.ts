import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
  }
  return globalForRedis.redis;
}
