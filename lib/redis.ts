import { Redis } from "ioredis";

console.log(
  `[Redis Init] REDIS_URL: ${process.env.REDIS_URL ? "SET" : "NOT SET"}`,
);
console.log(
  `[Redis Init] REDIS_PASSWORD: ${process.env.REDIS_PASSWORD ? "SET" : "NOT SET"} (Value length: ${process.env.REDIS_PASSWORD?.length || 0})`,
);

function makeRedis() {
  return new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    password: process.env.REDIS_PASSWORD,
  });
}

// Dedicated connection for direct store commands (get/set/del/scan).
// NOT shared with BullMQ — ioredis connections in subscriber mode can only
// issue SUBSCRIBE commands, so BullMQ must have its own connection.
export default makeRedis();

// Dedicated connection template for BullMQ. Queue/Worker/QueueScheduler call
// .duplicate() on this, so each BullMQ client gets its own socket.
export const bullmqConnection = makeRedis();
