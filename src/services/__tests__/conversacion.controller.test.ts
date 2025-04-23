/**
 * Tests para el controlador de conversación
 */

import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ConversacionController } from '../conversacion.controller';
import { AIService } from '../aiservices';
import { Domain } from '../../core/promptCore';

// Mock manual de las dependencias
const mockDetectDomain = jest.fn().mockReturnValue('dental');
const mockDetectIntent = jest.fn().mockReturnValue({ intent: 'info_general', params: {} });

// Mock de los módulos
jest.mock('../../router', () => ({
  detectDomain: mockDetectDomain,
  detectIntent: mockDetectIntent
}));

jest.mock('../aiservices');

describe('ConversacionController', () => {
  let conversacionController: ConversacionController;
  let mockAIService: any;
  
  beforeEach(() => {
    // Limpiar todos los mocks
    jest.clearAllMocks();
    
    // Configurar el mock de AIService
    mockAIService = {
      getDomain: jest.fn().mockReturnValue('dental'),
      setDomain: jest.fn(),
      processMessage: jest.fn().mockResolvedValue('Respuesta simulada del asistente'),
    };
    
    // Resetear los mocks del router
    mockDetectDomain.mockClear();
    mockDetectIntent.mockClear();
    
    // Crear instancia del controlador con dependencias mockeadas
    conversacionController = new ConversacionController(mockAIService);
  });
  
  describe('processMessage', () => {
    it('debe procesar un mensaje y devolver una respuesta estructurada', async () => {
      // Configurar el mock para este test
      mockDetectDomain.mockReturnValue('dental');
      
      // Ejecutar el método a probar
      const result = await conversacionController.processMessage(
        '¿Cuánto cuesta un blanqueamiento dental?',
        '+1234567890'
      );
      
      // Verificar que se llamaron los métodos esperados
      expect(mockDetectDomain).toHaveBeenCalledWith('¿Cuánto cuesta un blanqueamiento dental?');
      expect(mockDetectIntent).toHaveBeenCalledWith('¿Cuánto cuesta un blanqueamiento dental?', 'dental');
      expect(mockAIService.processMessage).toHaveBeenCalledWith('¿Cuánto cuesta un blanqueamiento dental?', '+1234567890');
      
      // Verificar la estructura de la respuesta
      expect(result).toEqual({
        success: true,
        message: 'Respuesta simulada del asistente',
        domain: 'dental',
        intent: 'info_general',
        params: {},
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          domainChanged: false
        })
      });
    });
    
    it('debe cambiar de dominio cuando se detecta uno diferente', async () => {
      // Configurar los mocks para este test
      mockAIService.getDomain.mockReturnValue('dental');
      mockDetectDomain.mockReturnValue('dermatologia');
      
      // Ejecutar el método a probar
      const result = await conversacionController.processMessage(
        '¿Tienen tratamientos para el acné?',
        '+1234567890'
      );
      
      // Verificar que se cambió el dominio
      expect(mockAIService.setDomain).toHaveBeenCalledWith('dermatologia');
      
      // Verificar la estructura de la respuesta
      expect(result).toEqual({
        success: true,
        message: 'Respuesta simulada del asistente',
        domain: 'dermatologia',
        intent: 'info_general',
        params: {},
        metadata: expect.objectContaining({
          domainChanged: true
        })
      });
    });
    
    it('debe manejar errores correctamente', async () => {
      // Configurar el mock para simular un error
      mockAIService.processMessage.mockRejectedValue(new Error('Error de prueba'));
      
      // Ejecutar el método a probar
      const result = await conversacionController.processMessage(
        'Mensaje de prueba',
        '+1234567890'
      );
      
      // Verificar la estructura de la respuesta de error
      expect(result).toEqual({
        success: false,
        message: 'Error: Error de prueba',
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          errorType: 'Error'
        })
      });
    });
  });
  
  describe('startConversation', () => {
    it('debe iniciar una conversación con el dominio por defecto', async () => {
      // Ejecutar el método a probar
      const result = await conversacionController.startConversation('+1234567890');
      
      // Verificar que no se cambió el dominio
      expect(mockAIService.setDomain).not.toHaveBeenCalled();
      
      // Verificar la estructura de la respuesta
      expect(result).toEqual({
        success: true,
        message: expect.stringContaining('Clínica Dental'),
        domain: 'dental',
        intent: 'welcome',
        metadata: expect.objectContaining({
          isNewConversation: true
        })
      });
    });
    
    it('debe iniciar una conversación con un dominio específico', async () => {
      // Ejecutar el método a probar
      const result = await conversacionController.startConversation(
        '+1234567890',
        'educacion'
      );
      
      // Verificar que se estableció el dominio
      expect(mockAIService.setDomain).toHaveBeenCalledWith('educacion');
      
      // Verificar la estructura de la respuesta
      expect(result).toEqual({
        success: true,
        message: expect.stringContaining('institución educativa'),
        domain: 'dental', // El mock de getDomain siempre devuelve 'dental'
        intent: 'welcome',
        metadata: expect.objectContaining({
          isNewConversation: true
        })
      });
    });
  });
  
  describe('changeDomain', () => {
    it('debe cambiar explícitamente el dominio', async () => {
      // Ejecutar el método a probar
      const result = await conversacionController.changeDomain(
        '+1234567890',
        'municipal'
      );
      
      // Verificar que se cambió el dominio
      expect(mockAIService.setDomain).toHaveBeenCalledWith('municipal');
      
      // Verificar la estructura de la respuesta
      expect(result).toEqual({
        success: true,
        message: expect.stringContaining('Servicios Municipales'),
        domain: 'municipal',
        intent: 'domain_change',
        metadata: expect.objectContaining({
          previousDomain: 'dental',
          manualChange: true
        })
      });
    });
  });
  
  // Test simplificado de integración con diferentes dominios
  describe('integración con router de dominios', () => {
    it('debe detectar correctamente una consulta dental', async () => {
      // Configurar mocks
      mockDetectDomain.mockReturnValue('dental');
      mockDetectIntent.mockReturnValue({ intent: 'consultar_precio', params: {} });
      
      // Ejecutar el método
      const result = await conversacionController.processMessage(
        '¿Cuánto cuesta un blanqueamiento dental?',
        '+1234567890'
      );
      
      // Verificar resultado
      expect(result.domain).toBe('dental');
      expect(result.intent).toBe('consultar_precio');
    });
    
    it('debe detectar correctamente una consulta dermatológica', async () => {
      // Configurar mocks
      mockDetectDomain.mockReturnValue('dermatologia');
      mockDetectIntent.mockReturnValue({ intent: 'info_general', params: {} });
      
      // Ejecutar el método
      const result = await conversacionController.processMessage(
        '¿Tienen tratamientos para el acné?',
        '+1234567890'
      );
      
      // Verificar resultado
      expect(result.domain).toBe('dermatologia');
      expect(result.intent).toBe('info_general');
      expect(mockAIService.setDomain).toHaveBeenCalledWith('dermatologia');
    });
  });
});
