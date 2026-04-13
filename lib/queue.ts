import { Queue } from 'bullmq';
import connection from './redis';

export const syncQueue = new Queue('sync', { connection });
