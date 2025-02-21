import 'reflect-metadata';
import { createBot } from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { provider } from "./provider";
import { config } from "./config";
import templates from "./templates";
import aiServices from "./services/aiservices";
import { redis } from './config';  // Importar desde config donde ya está inicializado

const PORT = process.env.PORT || config.PORT || 3000;

const main = async () => {
  try {
    // Inicializar servicios
    const { handleCtx, httpServer } = await createBot({
      flow: templates,
      provider: provider,
      database: new Database(),
    });

    // Iniciamos el servidor HTTP
    httpServer(+PORT);
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log('📱 WhatsApp Bot is ready');

    // Manejadores para graceful shutdown
    const shutdown = async () => {
      console.log('Cerrando servidor...');
      try {
        await provider.stop();
        await redis.disconnect();  // Usar disconnect() en lugar de quit() para ioredis
        console.log('Bot y servicios cerrados exitosamente');
        process.exit(0);
      } catch (error) {
        console.error('Error durante el cierre:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Error iniciando el bot:', error);
    process.exit(1);
  }
};

main();