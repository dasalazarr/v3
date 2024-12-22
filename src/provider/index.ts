import { MetaProvider as Provider } from "@builderbot/provider-meta";
import { createProvider } from "@builderbot/bot";
import { config } from "../config";

export const provider = createProvider(Provider, {
  jwtToken: config.jwtToken,
  numberId: config.numberId,
  verifyToken: config.verifyToken,
  version: config.version,
  Model: config.Model,
  apiKey: config.apiKey,
  spreadsheetId: config.spreadsheetId,
  privateKey: config.privateKey,
  clientEmail: config.clientEmail
});