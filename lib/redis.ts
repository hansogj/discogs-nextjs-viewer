import { Redis } from "ioredis";

console.log(
  `[Redis Init] REDIS_URL: ${process.env.REDIS_URL ? "SET" : "NOT SET"}`,
);
console.log(
  `[Redis Init] REDIS_PASSWORD: ${process.env.REDIS_PASSWORD ? "SET" : "NOT SET"} (Value length: ${process.env.REDIS_PASSWORD?.length || 0})`,
);

// Store connection: finite retry count so Redis timeouts surface as errors
// rather than hanging indefinitely. maxRetriesPerRequest defaults to 20 in
// ioredis; we keep the default (null → infinite is only safe for BullMQ).
const storeConnection = new Redis(process.env.REDIS_URL!, {
  password: process.env.REDIS_PASSWORD,
  lazyConnect: true,
  connectTimeout: 5000,
  commandTimeout: 5000,
});

// BullMQ connection: requires maxRetriesPerRequest: null — the queue and
// worker use blocking commands that must not be retried by ioredis.
export const bullmqConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  password: process.env.REDIS_PASSWORD,
});

export default storeConnection;
