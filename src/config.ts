import dotenv from 'dotenv';
dotenv.config();

export const config = {
  apiKey: process.env.apiKey || process.env.API_KEY || '',
  assistant_id: process.env.ASSISTANT_ID || '',
  baseURL: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  Model: process.env.Model || 'deepseek-chat',
  spreadsheetId: process.env.spreadsheetId || '',
  privateKey: process.env.privateKey?.replace(/\\n/g, '\n') || '',
  clientEmail: process.env.clientEmail || '',
  jwtToken: process.env.jwtToken || '',
  numberId: process.env.numberId || '',
  PORT: process.env.PORT || 3000,
  verifyToken: process.env.verifyToken || '',
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  version: '1.0.0'
};
