/**
 * Script para crear/configurar hojas de cálculo para el MVP odontológico
 * 
 * Este script define la estructura de las hojas para:
 * 1. Pacientes dentales
 * 2. Citas odontológicas
 * 
 * Ejecución: 
 * node scripts/create_dental_sheets.js
 */

const { google } = require('googleapis');
require('dotenv').config();

// Autenticación con Google
const auth = new google.auth.JWT({
  email: process.env.clientEmail,
  key: process.env.privateKey.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

// IDs de las hojas (desde variables de entorno)
const APPOINTMENTS_SHEET_ID = process.env.spreadsheetId;
const PATIENTS_SHEET_ID = process.env.PATIENTS_SPREADSHEET_ID;

// Configurar la hoja de pacientes
async function setupPatientsSheet() {
  console.log('Configurando hoja de pacientes...');
  
  try {
    // Verificar si la hoja ya existe
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: PATIENTS_SHEET_ID
    });
    
    // Crear hoja "Patients" si no existe
    const sheetsExists = sheetInfo.data.sheets.some(
      sheet => sheet.properties.title === 'Patients'
    );
    
    if (!sheetsExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: PATIENTS_SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: 'Patients' }
            }
          }]
        }
      });
      console.log('Hoja "Patients" creada.');
    }
    
    // Configurar encabezados
    await sheets.spreadsheets.values.update({
      spreadsheetId: PATIENTS_SHEET_ID,
      range: 'Patients!A1:F1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          'Fecha Registro',
          'Nombre Completo',
          'Teléfono',
          'Email',
          'Notas',
          'ID Paciente'
        ]]
      }
    });
    
    console.log('Encabezados configurados para hoja de pacientes.');
    
  } catch (error) {
    console.error('Error configurando hoja de pacientes:', error);
  }
}

// Configurar la hoja de citas
async function setupAppointmentsSheet() {
  console.log('Configurando hoja de citas...');
  
  try {
    // Verificar si la hoja ya existe
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: APPOINTMENTS_SHEET_ID
    });
    
    // Crear hoja "Citas Odontologicas" si no existe
    const sheetsExists = sheetInfo.data.sheets.some(
      sheet => sheet.properties.title === 'Citas Odontologicas'
    );
    
    if (!sheetsExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: APPOINTMENTS_SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: 'Citas Odontologicas' }
            }
          }]
        }
      });
      console.log('Hoja "Citas Odontologicas" creada.');
    }
    
    // Configurar encabezados
    await sheets.spreadsheets.values.update({
      spreadsheetId: APPOINTMENTS_SHEET_ID,
      range: 'Citas Odontologicas!A1:I1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          'Fecha Inicio',
          'Fecha Fin',
          'Título',
          'Descripción',
          'ID Evento',
          'Estado',
          'Fecha Creación',
          'ID Paciente',
          'Tipo Procedimiento'
        ]]
      }
    });
    
    console.log('Encabezados configurados para hoja de citas.');
    
  } catch (error) {
    console.error('Error configurando hoja de citas:', error);
  }
}

// Ejecutar configuración
async function main() {
  console.log('Iniciando configuración de hojas para clínica dental...');
  
  if (!PATIENTS_SHEET_ID || !APPOINTMENTS_SHEET_ID) {
    console.error('ERROR: Debes configurar las variables de entorno:');
    console.error('- spreadsheetId (para citas)');
    console.error('- PATIENTS_SPREADSHEET_ID (para pacientes)');
    process.exit(1);
  }
  
  await setupPatientsSheet();
  await setupAppointmentsSheet();
  
  console.log('Configuración completada exitosamente.');
}

main().catch(console.error);
