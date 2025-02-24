import { MetaProvider as Provider } from "@builderbot/provider-meta";
import { createProvider } from "@builderbot/bot";
import { config } from "../config";

// Validate Meta credentials
const validateMetaCredentials = () => {
  const required = {
    'JWT Token': config.jwtToken,
    'Number ID': config.numberId,
    'Verify Token': config.verifyToken
  };

  let missingCredentials = [];
  for (const [name, value] of Object.entries(required)) {
    if (!value) {
      missingCredentials.push(name);
      console.error(`❌ Meta ${name} no está configurado`);
    } else {
      console.log(`✅ Meta ${name} configurado correctamente`);
    }
  }

  if (missingCredentials.length > 0) {
    console.error('🚨 Faltan credenciales de Meta:', missingCredentials.join(', '));
    console.error('📝 Visita: https://builderbot.vercel.app/en/providers/meta para más información');
  }
};

// Validate credentials before creating provider
validateMetaCredentials();

export const provider = createProvider(Provider, {
  jwtToken: config.jwtToken,
  numberId: config.numberId,
  verifyToken: config.verifyToken,
  version: "v17.0",  // Use a stable Meta API version
  Model: config.Model,
  apiKey: config.apiKey,
  spreadsheetId: config.spreadsheetId,
  privateKey: config.privateKey,
  clientEmail: config.clientEmail
});