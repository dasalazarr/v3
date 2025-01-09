import "dotenv/config";

// Log de variables de entorno al inicio
console.log(" Entorno:", process.env.NODE_ENV || 'development');
console.log(" Variables de entorno cargadas");

export const config = {
  PORT: process.env.PORT ?? 3000,
  jwtToken: process.env.jwtToken,
  numberId: process.env.numberId,
  verifyToken: process.env.verifyToken,
  version: "v20.0",
  Model: process.env.Model || "gpt-3.5-turbo",
  apiKey: process.env.apiKey || process.env.OPENAI_API_KEY, // Soporte para ambos formatos
  assistant_id: process.env.ASSISTANT_ID || process.env.assistant_id, // Soporte para ambos formatos
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
  'Client Email': config.clientEmail
};

// Verificar variables críticas
Object.entries(requiredVars).forEach(([name, value]) => {
  if (!value) {
    console.error(` ${name} no está configurado`);
  } else {
    console.log(` ${name} configurado correctamente`);
  }
});