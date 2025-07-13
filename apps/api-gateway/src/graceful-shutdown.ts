export function setupGracefulShutdown(services: any) {
  const shutdown = async (signal: string) => {
    console.log(`\n\uD83D\uDEA9 Received ${signal}, shutting down gracefully...`);

    try {
      await services.database.close();
      await services.chatBuffer.close();
      console.log('\u2705 All services closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('\u274c Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

