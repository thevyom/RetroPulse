import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Global teardown - runs once after all tests
 * Stops the MongoDB instance
 */
export default async function globalTeardown(): Promise<void> {
  console.log('Global teardown: Stopping MongoDB...');

  const mongod = (globalThis as Record<string, unknown>).__MONGOD__ as MongoMemoryServer | undefined;

  if (mongod) {
    await mongod.stop();
    console.log('Global teardown: MongoDB stopped');
  }
}
