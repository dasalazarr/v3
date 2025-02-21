import "dotenv/config";
import { container } from "tsyringe";
import { Redis } from "ioredis";
import { ChromaClient } from "chromadb";

// Log de variables de entorno al inicio
console.log(" Entorno:", process.env.NODE_ENV || 'development');
console.log(" Variables de entorno cargadas");

// Configuración centralizada
export const config = {
  PORT: process.env.PORT ?? 3000,
  jwtToken: process.env.jwtToken,
  numberId: process.env.numberId,
  verifyToken: process.env.verifyToken,
  version: "v20.0",
  Model: process.env.Model || "gpt-3.5-turbo",
  apiKey: process.env.apiKey || process.env.OPENAI_API_KEY,
  assistant_id: process.env.ASSISTANT_ID || process.env.assistant_id,
  spreadsheetId: process.env.spreadsheetId,
  privateKey: process.env.privateKey,
  clientEmail: process.env.clientEmail,
  redis: {
    url: process.env.REDIS_URL,
    ttl: 86400 // 24h
  },
  chroma: {
    url: process.env.CHROMA_URL || 'http://localhost:8000'
  }
};

// Singleton instances
export const redis = new Redis(config.redis.url);
export const chroma = new ChromaClient({ path: config.chroma.url });

// Container setup
container.registerInstance('Redis', redis);
container.registerInstance('Chroma', chroma);
container.register('Config', { useValue: config });

// Error handler middleware
export const errorHandler = async (ctx: any, next: () => Promise<any>) => {
  try {
    await next();
  } catch (error) {
    console.error('[Error]:', error);
    await ctx.sendText('Lo siento, hubo un error. Por favor, intenta nuevamente.');
    // TODO: Implement proper error logging/monitoring
  }
};

// Verificación de variables críticas
const requiredVars = {
  'API Key': config.apiKey,
  'Assistant ID': config.assistant_id,
  'JWT Token': config.jwtToken,
  'Number ID': config.numberId,
  'Spreadsheet ID': config.spreadsheetId,
  'Private Key': config.privateKey,
  'Client Email': config.clientEmail,
  'Redis URL': config.redis.url
};

// Verificar variables críticas
Object.entries(requiredVars).forEach(([name, value]) => {
  if (!value) {
    console.error(` ${name} no está configurado`);
  } else {
    console.log(` ${name} configurado correctamente`);
  }
});