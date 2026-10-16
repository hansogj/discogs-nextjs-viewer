import { Queue } from "bullmq";
import { bullmqConnection } from "./redis";

export const syncQueue = new Queue("sync", { connection: bullmqConnection });
