import "dotenv/config";

// Log de variables de entorno al inicio
console.log(" Entorno:", process.env.NODE_ENV || 'development');
console.log(" Variables de entorno cargadas");

// Validate and get API key
const getApiKey = () => {
  const key = process.env.apiKey || process.env.API_KEY;
  if (!key) {
    console.error("⚠️ API Key no configurada");
  }
  return key;
};

// Validate and get base URL
const getBaseUrl = () => {
  const url = process.env.baseURL || "https://api.deepseek.com";
  console.log("🔗 Using API URL:", url);
  return url;
};

export const config = {
  PORT: process.env.PORT ?? 3000,
  jwtToken: process.env.jwtToken,
  numberId: process.env.numberId,
  verifyToken: process.env.verifyToken,
  version: "v20.0",
  Model: process.env.Model || process.env.model || "deepseek-chat",
  baseURL: getBaseUrl(),
  apiKey: getApiKey(),
  assistant_id: process.env.ASSISTANT_ID || process.env.assistant_id,
  spreadsheetId: process.env.spreadsheetId,
  privateKey: process.env.privateKey,
  clientEmail: process.env.clientEmail
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
  'Base URL': config.baseURL,
  'Model': config.Model
};

// Verificar variables críticas
Object.entries(requiredVars).forEach(([name, value]) => {
  if (!value) {
    console.error(`❌ ${name} no está configurado`);
  } else {
    console.log(`✅ ${name} configurado correctamente`);
  }
});