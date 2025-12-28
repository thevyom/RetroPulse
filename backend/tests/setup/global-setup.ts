import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Global setup - runs once before all tests
 * Downloads MongoDB binary if not already cached
 */
export default async function globalSetup(): Promise<void> {
  // This will download MongoDB binary if not cached
  // The binary is cached at ~/.cache/mongodb-binaries/
  console.log('Global setup: Ensuring MongoDB binary is downloaded...');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Store URI for tests to use
  process.env.MONGO_TEST_URI = uri;

  // Store instance reference for teardown
  (globalThis as Record<string, unknown>).__MONGOD__ = mongod;

  console.log(`Global setup: MongoDB started at ${uri}`);
}
