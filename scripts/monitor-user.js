#!/usr/bin/env node

import { execSync } from 'child_process';

const PHONE_NUMBER = '593984074389';
let lastStatus = null;

function checkUser() {
  try {
    const output = execSync(`npx tsx packages/database/src/scripts/find-user.ts ${PHONE_NUMBER}`, 
      { encoding: 'utf8', stdio: 'pipe' });
    
    const timestamp = new Date().toLocaleTimeString();
    
    if (output.includes('No users found')) {
      if (lastStatus !== 'not_found') {
        console.log(`[${timestamp}] ❌ Usuario no encontrado`);
        lastStatus = 'not_found';
      }
    } else if (output.includes('User found')) {
      if (lastStatus !== 'found') {
        console.log(`[${timestamp}] ✅ ¡USUARIO CREADO!`);
        console.log(output);
        lastStatus = 'found';
      }
    }
  } catch (error) {
    console.log(`[${new Date().toLocaleTimeString()}] Error checking user:`, error.message);
  }
}

console.log('🔍 Monitoreando creación de usuario...');
console.log(`📱 Número de teléfono: ${PHONE_NUMBER}`);
console.log('💬 Envía el mensaje de WhatsApp ahora: "Hola, quiero empezar a entrenar"');
console.log('⏱️  Verificando cada 3 segundos...\n');

// Check immediately
checkUser();

// Then check every 3 seconds
const interval = setInterval(checkUser, 3000);

// Stop after 5 minutes
setTimeout(() => {
  clearInterval(interval);
  console.log('\n⏰ Monitoreo terminado después de 5 minutos');
  process.exit(0);
}, 5 * 60 * 1000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n👋 Monitoreo detenido por el usuario');
  process.exit(0);
});
