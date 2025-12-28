import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

let mongoServer: MongoMemoryServer | null = null;
let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Start an in-memory MongoDB instance for testing
 * Call this once in beforeAll() of your test suite
 */
export async function startTestDb(): Promise<Db> {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  client = new MongoClient(uri);
  await client.connect();

  db = client.db('test_retroboard');
  return db;
}

/**
 * Stop the in-memory MongoDB instance
 * Call this in afterAll() of your test suite
 */
export async function stopTestDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
  db = null;
}

/**
 * Get the current test database instance
 * Throws if database not started
 */
export function getTestDb(): Db {
  if (!db) {
    throw new Error('Test database not started. Call startTestDb() first.');
  }
  return db;
}

/**
 * Clear all collections in the test database
 * Call this in beforeEach() to ensure test isolation
 */
export async function clearTestDb(): Promise<void> {
  if (!db) {
    throw new Error('Test database not started. Call startTestDb() first.');
  }

  const collections = await db.listCollections().toArray();
  await Promise.all(
    collections.map((col) => db!.collection(col.name).deleteMany({}))
  );
}

/**
 * Get the MongoDB client for advanced operations
 */
export function getTestClient(): MongoClient {
  if (!client) {
    throw new Error('Test database not started. Call startTestDb() first.');
  }
  return client;
}
