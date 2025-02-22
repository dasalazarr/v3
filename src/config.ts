import dotenv from 'dotenv';
dotenv.config();

export const config = {
  apiKey: process.env.API_KEY || '',
  assistant_id: process.env.ASSISTANT_ID || '',
  baseURL: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  Model: 'deepseek-chat', // Para compatibilidad con código existente
  spreadsheetId: process.env.SPREADSHEET_ID || '',
  privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  clientEmail: process.env.CLIENT_EMAIL || '',
  jwtToken: process.env.JWT_TOKEN || '',
  numberId: process.env.NUMBER_ID || '',
  PORT: process.env.PORT || 3000,
  verifyToken: process.env.VERIFY_TOKEN || 'VERIFY_TOKEN',
  version: '1.0.0'
};
