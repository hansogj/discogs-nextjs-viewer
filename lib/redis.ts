import { Redis } from "ioredis";

console.log(
  `[Redis Init] REDIS_URL: ${process.env.REDIS_URL ? "SET" : "NOT SET"}`,
);
console.log(
  `[Redis Init] REDIS_PASSWORD: ${process.env.REDIS_PASSWORD ? "SET" : "NOT SET"} (Value length: ${process.env.REDIS_PASSWORD?.length || 0})`,
);

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  password: process.env.REDIS_PASSWORD, // Add Redis password from environment variable
});

export default connection;
