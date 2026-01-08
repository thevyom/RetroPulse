import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { env } from '@/shared/config/index.js';
import { logger } from '@/shared/logger/index.js';

let client: MongoClient | null = null;
let db: Db | null = null;

const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    logger.info('Connecting to MongoDB...', { url: env.MONGODB_URL.replace(/\/\/.*@/, '//***@') });

    client = new MongoClient(env.MONGODB_URL, options);
    await client.connect();

    db = client.db(env.MONGODB_DATABASE);

    // Verify connection
    await db.command({ ping: 1 });
    logger.info('Successfully connected to MongoDB', { database: env.MONGODB_DATABASE });

    return db;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('Disconnected from MongoDB');
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return db;
}

export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return client;
}

export interface DatabaseHealthResult {
  status: 'up' | 'down';
  latency_ms: number | null;
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!db) {
      return false;
    }
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function checkDatabaseHealthDetailed(): Promise<DatabaseHealthResult> {
  try {
    if (!db) {
      return { status: 'down', latency_ms: null };
    }
    const startTime = Date.now();
    await db.command({ ping: 1 });
    const latency = Date.now() - startTime;
    return { status: 'up', latency_ms: latency };
  } catch {
    return { status: 'down', latency_ms: null };
  }
}

// Graceful shutdown handler
export async function gracefulShutdown(): Promise<void> {
  logger.info('Graceful shutdown initiated...');
  await disconnectFromDatabase();
}

// Handle process termination
process.on('SIGINT', () => void gracefulShutdown());
process.on('SIGTERM', () => void gracefulShutdown());
