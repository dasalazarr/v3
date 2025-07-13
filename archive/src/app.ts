import "reflect-metadata";
import { createBot } from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { provider } from "./provider";
import { config } from "./config";
import templates from "./templates";
import container from "./di/container";
import { ScheduledTasks } from "./services/scheduledTasks";

const PORT = process.env.PORT || config.PORT || 3000;

const main = async () => {
  try {
    // Inicializar el contenedor de DI antes de crear el bot
    const scheduledTasks = container.resolve<ScheduledTasks>('ScheduledTasks');
    
    const { handleCtx, httpServer } = await createBot({
      flow: templates,
      provider: provider,
      database: new Database(),
    });

    // Iniciamos el servidor HTTP
    httpServer(+PORT);
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log('📱 WhatsApp Bot is ready');

    // Iniciamos las tareas programadas
    scheduledTasks.startAll();
    console.log('⏰ Scheduled tasks started');

    // Manejadores para graceful shutdown
    const shutdown = async () => {
      console.log('Cerrando servidor...');
      try {
        // Detenemos las tareas programadas
        scheduledTasks.stopAll();
        await provider.stop();
        console.log('Bot cerrado exitosamente');
        process.exit(0);
      } catch (error) {
        console.error('Error durante el cierre:', error);
        process.exit(1);
      }
    };

    // Manejadores de señales del sistema
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
    // Manejador de errores no capturados
    process.on('uncaughtException', (error) => {
      console.error('Error no capturado:', error);
      shutdown();
    });

  } catch (error) {
    console.error('Error al iniciar el bot:', error);
    process.exit(1);
  }
};

main();