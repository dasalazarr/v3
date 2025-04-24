/**
 * Tests para el motor de plantillas
 */

import 'reflect-metadata';
import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { TemplateEngine, TemplateVars } from '../templateEngine';

// Mock de fs
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
}));

describe('TemplateEngine', () => {
  let templateEngine: TemplateEngine;
  
  beforeEach(() => {
    jest.clearAllMocks();
    templateEngine = new TemplateEngine();
    
    // Mock para simular la lectura de archivos de plantilla
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: any) => {
      if (typeof filePath === 'string' && filePath.includes('welcome.hbs')) {
        return '¡Hola{{#if user.name}} {{user.name}}{{/if}}! Bienvenido/a a nuestro asistente virtual.';
      } else if (typeof filePath === 'string' && filePath.includes('appointment_success.hbs')) {
        return '✅ ¡Tu cita ha sido agendada para el {{formatDate date}}!';
      } else if (typeof filePath === 'string' && filePath.includes('error.hbs')) {
        return 'Error: {{error}}';
      } else {
        return 'Plantilla no encontrada';
      }
    });
  });
  
  describe('render', () => {
    it('debe renderizar una plantilla simple', () => {
      const result = templateEngine.render('welcome', {
        user: { name: 'Juan' }
      });
      
      expect(result).toBe('¡Hola Juan! Bienvenido/a a nuestro asistente virtual.');
      expect(fs.readFileSync).toHaveBeenCalled();
    });
    
    it('debe manejar variables opcionales', () => {
      const result = templateEngine.render('welcome', {});
      
      expect(result).toBe('¡Hola! Bienvenido/a a nuestro asistente virtual.');
    });
    
    it('debe usar el helper formatDate', () => {
      const date = new Date('2025-04-24T10:00:00');
      const result = templateEngine.render('appointment_success', { date });
      
      expect(result).toContain('¡Tu cita ha sido agendada para el');
      expect(result).not.toContain('{{formatDate');
    });
    
    it('debe manejar errores al cargar plantillas', () => {
      (fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Archivo no encontrado');
      });
      
      try {
        templateEngine.render('non_existent');
        fail('Debería haber lanzado un error');
      } catch (error) {
        expect(error.message).toContain('No se pudo cargar la plantilla');
      }
    });
  });
  
  describe('renderString', () => {
    it('debe renderizar una plantilla desde un string', () => {
      const template = 'Hola {{user.name}}, tu dominio es {{domain}}.';
      const vars: TemplateVars = {
        user: { name: 'María' },
        domain: 'dental'
      };
      
      const result = templateEngine.renderString(template, vars);
      
      expect(result).toBe('Hola María, tu dominio es dental.');
    });
    
    it('debe manejar errores en la plantilla', () => {
      const template = 'Hola {{#each user}}';  // Plantilla inválida
      const vars: TemplateVars = { user: { name: 'Pedro' } };
      
      const result = templateEngine.renderString(template, vars);
      
      // Debería devolver la plantilla original en caso de error
      expect(result).toBe(template);
    });
  });
  
  describe('helpers', () => {
    it('debe registrar y usar helpers personalizados', () => {
      // Registrar un helper personalizado
      templateEngine.registerHelper('uppercase', (text: string) => {
        return text.toUpperCase();
      });
      
      const result = templateEngine.renderString('Hola {{uppercase user.name}}', {
        user: { name: 'carlos' }
      });
      
      expect(result).toBe('Hola CARLOS');
    });
    
    it('debe usar el helper when para condicionales', () => {
      const template = '{{#when value "eq" 10}}Es igual{{else}}No es igual{{/when}}';
      
      const resultTrue = templateEngine.renderString(template, { value: 10 });
      const resultFalse = templateEngine.renderString(template, { value: 5 });
      
      expect(resultTrue).toBe('Es igual');
      expect(resultFalse).toBe('No es igual');
    });
  });
});
