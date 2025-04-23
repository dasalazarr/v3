/**
 * Tests para el módulo PromptCore
 */

import 'reflect-metadata';

import { PromptCore, Domain } from '../promptCore.js';
import * as fs from 'fs';
import * as path from 'path';
import { jest } from '@jest/globals';

// Mock de fs y path
jest.mock('fs');
jest.mock('path');

describe('PromptCore', () => {
  let promptCore: PromptCore;
  
  beforeEach(() => {
    // Reiniciar mocks antes de cada prueba
    jest.clearAllMocks();
    
    // Mock de path.join para devolver rutas predecibles
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    
    // Instanciar PromptCore para cada prueba
    promptCore = new PromptCore();
  });
  
  describe('Constructor y configuración', () => {
    test('Debe inicializarse con configuración por defecto', () => {
      // @ts-ignore - Acceder a propiedad privada para testing
      expect(promptCore.config).toEqual({
        organizationName: 'Organización',
        assistantName: 'Asistente',
        maxEmojisPerMessage: 2
      });
    });
    
    test('Debe actualizar la configuración correctamente', () => {
      promptCore.setConfig({
        organizationName: 'Clínica Dental',
        assistantName: 'Sofi',
        maxEmojisPerMessage: 1
      });
      
      // @ts-ignore - Acceder a propiedad privada para testing
      expect(promptCore.config).toEqual({
        organizationName: 'Clínica Dental',
        assistantName: 'Sofi',
        maxEmojisPerMessage: 1
      });
    });
  });
  
  describe('Carga de prompts', () => {
    test('Debe cargar un prompt de dominio existente', async () => {
      // Mock de fs.existsSync para simular que el archivo existe
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      // Mock de fs.readFileSync para devolver un prompt de prueba
      (fs.readFileSync as jest.Mock).mockReturnValue('Prompt de prueba para dominio dental');
      
      const result = await promptCore.loadDomainPrompt('dental');
      
      expect(result).toBe('Prompt de prueba para dominio dental');
      expect(fs.existsSync).toHaveBeenCalledWith('assets/prompts/prompt_dental.txt');
      expect(fs.readFileSync).toHaveBeenCalledWith('assets/prompts/prompt_dental.txt', 'utf8');
    });
    
    test('Debe usar el prompt DeepSeek por defecto si no existe el específico', async () => {
      // Mock para simular que el archivo específico no existe pero el default sí
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readFileSync as jest.Mock).mockReturnValue('Prompt DeepSeek por defecto');
      
      const result = await promptCore.loadDomainPrompt('municipal' as Domain);
      
      expect(result).toBe('Prompt DeepSeek por defecto');
      expect(fs.existsSync).toHaveBeenCalledWith('assets/prompts/prompt_municipal.txt');
      expect(fs.readFileSync).toHaveBeenCalledWith('assets/prompts/prompt_DeepSeek.txt', 'utf8');
    });
    
    test('Debe devolver un fallback si hay error al cargar el prompt', async () => {
      // Mock para simular un error de lectura
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Error de lectura');
      });
      
      // Spy en getFallbackPrompt
      const getFallbackSpy = jest.spyOn(promptCore, 'getFallbackPrompt');
      
      const result = await promptCore.loadDomainPrompt('dental');
      
      expect(getFallbackSpy).toHaveBeenCalledWith('dental');
      expect(result).toContain('asistente virtual');
    });
  });
  
  describe('Saludos y mensajes', () => {
    test('Debe generar un saludo genérico sin nombre', () => {
      // Mock de Date para tener una hora controlada (10am)
      const mockDate = new Date(2023, 1, 1, 10, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      
      const greeting = promptCore.getGreeting();
      
      expect(greeting).toBe('Buenos días! Soy Asistente, ¿en qué puedo ayudarte hoy?');
    });
    
    test('Debe generar un saludo personalizado con nombre', () => {
      // Mock de Date para tener una hora controlada (15pm)
      const mockDate = new Date(2023, 1, 1, 15, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      
      const greeting = promptCore.getGreeting('María');
      
      expect(greeting).toBe('Buenas tardes, María! Soy Asistente, ¿en qué puedo ayudarte hoy?');
    });
    
    test('Debe generar un saludo nocturno', () => {
      // Mock de Date para tener una hora controlada (22pm)
      const mockDate = new Date(2023, 1, 1, 22, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      
      const greeting = promptCore.getGreeting();
      
      expect(greeting).toBe('Buenas noches! Soy Asistente, ¿en qué puedo ayudarte hoy?');
    });
    
    test('Debe obtener mensajes de fallback específicos', () => {
      const errorMessage = promptCore.getFallbackMessage('error_general');
      const noEntiendo = promptCore.getFallbackMessage('no_entiendo');
      
      expect(errorMessage).toContain('ha ocurrido un error inesperado');
      expect(noEntiendo).toContain('no he entendido tu solicitud');
    });
    
    test('Debe devolver un mensaje genérico para tipos de fallback desconocidos', () => {
      const unknownFallback = promptCore.getFallbackMessage('tipo_inexistente');
      
      expect(unknownFallback).toContain('no puedo procesar tu solicitud');
    });
  });
  
  describe('Confirmaciones de citas', () => {
    test('Debe generar confirmación de cita sin proveedor', () => {
      const confirmation = promptCore.getAppointmentConfirmation(
        'limpieza dental', 
        '15 de mayo', 
        '10:00'
      );
      
      expect(confirmation).toContain('He agendado tu limpieza dental para el 15 de mayo a las 10:00');
      expect(confirmation).not.toContain('con');
      expect(confirmation).toContain('😁');
    });
    
    test('Debe generar confirmación de cita con proveedor', () => {
      const confirmation = promptCore.getAppointmentConfirmation(
        'consulta dermatológica', 
        '20 de mayo', 
        '15:30',
        'Dra. García'
      );
      
      expect(confirmation).toContain('He agendado tu consulta dermatológica para el 20 de mayo a las 15:30 con Dra. García');
    });
  });
  
  describe('Composición de prompts', () => {
    test('Debe componer un prompt completo sin contexto', async () => {
      // Mock para simular que el archivo existe
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('Prompt base para {{dominio}}');
      
      const fullPrompt = await promptCore.getFullPrompt('dental');
      
      expect(fullPrompt).toBe('Prompt base para {{dominio}}');
    });
    
    test('Debe componer un prompt con sustitución de variables de contexto', async () => {
      // Mock para simular que el archivo existe
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('Prompt para {{dominio}} con {{variable}}');
      
      const fullPrompt = await promptCore.getFullPrompt('dental', {
        dominio: 'odontología',
        variable: 'valor personalizado'
      });
      
      expect(fullPrompt).toBe('Prompt para odontología con valor personalizado');
    });
  });
});
