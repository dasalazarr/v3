import "dotenv/config";
import { Config } from "../types";

if (!process.env.jwtToken) throw new Error('jwtToken is required');
if (!process.env.numberId) throw new Error('numberId is required');
if (!process.env.verifyToken) throw new Error('verifyToken is required');
if (!process.env.spreadsheetId) throw new Error('spreadsheetId is required');
if (!process.env.privateKey) throw new Error('privateKey is required');
if (!process.env.clientEmail) throw new Error('clientEmail is required');

export const config: Config = {
  PORT: +(process.env.PORT ?? 3000),
  jwtToken: process.env.jwtToken,
  numberId: process.env.numberId,
  verifyToken: process.env.verifyToken,
  version: "v20.0",
  Model: process.env.Model ?? "gpt-3.5-turbo",
  apiKey: process.env.apiKey ?? "",
  spreadsheetId: process.env.spreadsheetId,
  privateKey: process.env.privateKey.replace(/\\n/g, '\n'),
  clientEmail: process.env.clientEmail
};