import { createServer } from 'http';
import { createApp } from '@/gateway/index.js';
import { connectToDatabase, gracefulShutdown } from '@/shared/database/index.js';
import { logger } from '@/shared/logger/index.js';
import { env } from '@/shared/config/index.js';

async function main(): Promise<void> {
  try {
    // Connect to database
    const db = await connectToDatabase();

    // Create Express app with database
    const app = createApp(db);

    // Create HTTP server (for future Socket.io integration)
    const server = createServer(app);

    // Start server
    server.listen(env.PORT, () => {
      logger.info(`Server started`, {
        port: env.PORT,
        environment: env.NODE_ENV,
        frontend: env.FRONTEND_URL,
      });
    });

    // Handle graceful shutdown
    const shutdown = async (): Promise<void> => {
      logger.info('Shutting down server...');
      server.close(() => {
        logger.info('HTTP server closed');
      });
      await gracefulShutdown();
      process.exit(0);
    };

    process.on('SIGINT', () => void shutdown());
    process.on('SIGTERM', () => void shutdown());
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

void main();
