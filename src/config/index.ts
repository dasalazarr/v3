import "dotenv/config";

export const config = {
  PORT: process.env.PORT ?? 3000,
  jwtToken: process.env.jwtToken,
  numberId: process.env.numberId,
  verifyToken: process.env.verifyToken,
  version: "v20.0",
  Model: process.env.Model,
  apiKey: process.env.apiKey,
  assistant_id: process.env.ASSISTANT_ID,
  spreadsheetId: process.env.spreadsheetId,
  privateKey: process.env.privateKey,
  clientEmail: process.env.clientEmail
};