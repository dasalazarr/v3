#!/usr/bin/env tsx

import { config } from 'dotenv';

// Load environment variables
config();

function checkEnvVars() {
  console.log('⚙️ VERIFICANDO VARIABLES DE ENTORNO...\n');

  const allEnvVars = [
    'DATABASE_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'JWT_TOKEN',
    'NUMBER_ID',
    'VERIFY_TOKEN',
    'GUMROAD_PRODUCT_ID_EN',
    'GUMROAD_PRODUCT_ID_ES',
    'NODE_ENV'
  ];

  console.log('📋 Estado de variables de entorno:');
  console.log('=' .repeat(50));

  allEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      // Mostrar solo los primeros caracteres para seguridad
      const displayValue = value.length > 20 ? 
        `${value.substring(0, 15)}...` : 
        value;
      console.log(`✅ ${envVar}: ${displayValue}`);
    } else {
      console.log(`❌ ${envVar}: NO CONFIGURADO`);
    }
  });

  console.log('\n🔍 Variables específicas de Gumroad:');
  console.log(`GUMROAD_PRODUCT_ID_EN: "${process.env.GUMROAD_PRODUCT_ID_EN}"`);
  console.log(`GUMROAD_PRODUCT_ID_ES: "${process.env.GUMROAD_PRODUCT_ID_ES}"`);

  console.log('\n📁 Archivos .env encontrados:');
  const fs = require('fs');
  const path = require('path');
  
  const envFiles = ['.env', '.env.local', '.env.production'];
  envFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} existe`);
    } else {
      console.log(`❌ ${file} no existe`);
    }
  });

  console.log('\n🌐 Información del entorno:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'no definido'}`);
  console.log(`PWD: ${process.env.PWD || 'no definido'}`);
  console.log(`Directorio actual: ${process.cwd()}`);
}

checkEnvVars();
