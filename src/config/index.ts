import "dotenv/config";

// Log de variables de entorno al inicio
console.log(" Entorno:", process.env.NODE_ENV || 'development');
console.log(" Variables de entorno cargadas");

// Validate and get API key
const getApiKey = () => {
  const key = process.env.apiKey || process.env.API_KEY || process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.error("⚠️ API Key no configurada");
  }
  return key;
};

// Validate and get base URL
const getBaseUrl = () => {
  const url =
    process.env.baseURL ||
    process.env.DEEPSEEK_BASE_URL ||
    "https://api.deepseek.com/v1"
  console.log("🔗 Using API URL:", url);
  return url;
};

const getEmbeddingsConfig = () => {
  return {
    embeddingsApiKey: process.env.EMBEDDINGS_API_KEY,
    embeddingsBaseUrl: process.env.EMBEDDINGS_BASE_URL || 'https://api.openai.com/v1',
    embeddingsModel: process.env.EMBEDDINGS_MODEL || 'text-embedding-ada-002'
  };
};

// Validate Meta credentials
const getMetaCredentials = () => {
  const jwtToken = process.env.jwtToken;
  const numberId = process.env.numberId;
  const verifyToken = process.env.verifyToken;

  if (!jwtToken || !numberId || !verifyToken) {
    console.error("⚠️ Faltan credenciales de Meta WhatsApp");
  }

  return { jwtToken, numberId, verifyToken };
};

// Definición de tipos para el objeto config
/**
 * Archivo fuente de la verdad para configuración de variables de entorno.
 *
 * Aquí se centraliza toda la lógica, validación y tipado de las variables de entorno.
 * Si necesitas agregar o modificar variables, hazlo aquí.
 */

export interface Config {
  PORT: string | number;
  jwtToken?: string;
  numberId?: string;
  verifyToken?: string;
  Model: string;
  baseURL: string;
  apiKey?: string;
  embeddingsApiKey?: string;
  embeddingsBaseUrl?: string;
  embeddingsModel?: string;
  assistant_id?: string;
  spreadsheetId?: string;
  trainingSpreadsheetId?: string; // ID de la hoja para registrar entrenamientos
  privateKey?: string;
  clientEmail?: string;
  calendarId?: string;
}

export const config: Config = {
  PORT: process.env.PORT ?? 3000,
  ...getMetaCredentials(),
  Model: process.env.Model || process.env.model || process.env.DEEPSEEK_MODEL || "deepseek-chat",
  baseURL: getBaseUrl(),
  apiKey: getApiKey(),
  ...getEmbeddingsConfig(),
  assistant_id: process.env.ASSISTANT_ID || process.env.assistant_id,
  spreadsheetId: process.env.spreadsheetId,
  trainingSpreadsheetId: process.env.TRAINING_SPREADSHEET_ID,
  privateKey: process.env.privateKey,
  clientEmail: process.env.clientEmail,
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary'
};

// Verificación de variables críticas
  const requiredVars = {
    'API Key': config.apiKey,
    'Embeddings API Key': config.embeddingsApiKey,
    'JWT Token': config.jwtToken,
    'Number ID': config.numberId,
    'Verify Token': config.verifyToken,
    'Spreadsheet ID': config.spreadsheetId,
    'Training Spreadsheet ID': config.trainingSpreadsheetId,
    'Private Key': config.privateKey,
    'Client Email': config.clientEmail,
    'Calendar ID': config.calendarId,
    'Base URL': config.baseURL,
    'Model': config.Model,
    'Embeddings Base URL': config.embeddingsBaseUrl,
    'Embeddings Model': config.embeddingsModel
  };

// Verificar variables críticas
Object.entries(requiredVars).forEach(([name, value]) => {
  if (!value) {
    console.error(`❌ ${name} no está configurado`);
  } else {
    console.log(`✅ ${name} configurado correctamente`);
  }
});