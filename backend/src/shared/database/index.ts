export {
  connectToDatabase,
  disconnectFromDatabase,
  getDatabase,
  getMongoClient,
  checkDatabaseHealth,
  checkDatabaseHealthDetailed,
  gracefulShutdown,
} from './mongo-client.js';
export type { DatabaseHealthResult } from './mongo-client.js';
