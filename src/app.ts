import { createBot } from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { provider } from "./provider";
import { config } from "./config";
import templates from "./templates";
import http from 'http';

const PORT = process.env.PORT || config.PORT || 3000;

const main = async () => {
  try {
    const { handleCtx, httpServer } = await createBot({
      flow: templates,
      provider: provider,
      database: new Database(),
    });

    // Crear servidor HTTP personalizado
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() }));
        return;
      }
      // Manejar otras rutas aquí si es necesario
      res.writeHead(404);
      res.end();
    });

    // Iniciamos el servidor HTTP
    server.listen(+PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log('📱 WhatsApp Bot is ready');
    });

    // Manejadores para graceful shutdown
    const shutdown = async () => {
      console.log('Cerrando servidor...');
      try {
        server.close();
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