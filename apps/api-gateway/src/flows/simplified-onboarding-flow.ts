import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';

/**
 * Simplified onboarding endpoint that generates WhatsApp links with intent parameters
 * This replaces the complex web onboarding flow with a direct WhatsApp integration
 */
export const handleSimplifiedOnboarding = async (req: Request, res: Response) => {
  const { intent, language = 'en' } = req.body;

  // Validate intent parameter
  if (!intent || !['free', 'premium'].includes(intent)) {
    return res.status(400).json({ 
      error: 'Missing or invalid intent parameter. Must be "free" or "premium"' 
    });
  }

  // Validate language parameter
  if (!['en', 'es'].includes(language)) {
    return res.status(400).json({ 
      error: 'Invalid language parameter. Must be "en" or "es"' 
    });
  }

  try {
    // Get WhatsApp number - using the actual number from your system
    const whatsappNumber = '593987644414';
    
    // Create pre-filled message based on intent and language
    const intentMessages = {
      free: {
        en: 'Hi! I want to start free training with Andes 🏃‍♂️',
        es: '¡Hola! Quiero comenzar mi entrenamiento gratuito de running con Andes 🏃‍♂️'
      },
      premium: {
        en: 'Hi! I want to upgrade to Andes Premium 🏃‍♂️💎',
        es: '¡Hola! Quiero comenzar con Andes Premium ($9.99/mes) para mi entrenamiento de running 🏃‍♂️💎'
      }
    };

    const prefilledMessage = intentMessages[intent as 'free' | 'premium'][language as 'en' | 'es'];
    const encodedMessage = encodeURIComponent(prefilledMessage);
    
    // Generate WhatsApp link with pre-filled message
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    // Return the WhatsApp link for immediate redirection
    return res.status(200).json({ 
      success: true,
      whatsappLink,
      intent,
      language,
      message: language === 'es' 
        ? 'Serás redirigido a WhatsApp para comenzar tu entrenamiento'
        : 'You will be redirected to WhatsApp to start your training'
    });

  } catch (error) {
    console.error('Error in simplified onboarding:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: language === 'es' 
        ? 'Error interno del servidor. Por favor intenta de nuevo.'
        : 'Internal server error. Please try again.'
    });
  }
};

/**
 * Legacy endpoint for backward compatibility
 * Redirects to simplified flow
 */
export const handleLegacyWebOnboardingPremium = async (req: Request, res: Response) => {
  console.log('⚠️ Legacy premium endpoint called - redirecting to simplified flow');
  req.body.intent = 'premium';
  return handleSimplifiedOnboarding(req, res);
};

/**
 * Legacy endpoint for backward compatibility
 * Redirects to simplified flow
 */
export const handleLegacyWebOnboardingFree = async (req: Request, res: Response) => {
  console.log('⚠️ Legacy free endpoint called - redirecting to simplified flow');
  req.body.intent = 'free';
  return handleSimplifiedOnboarding(req, res);
};

/**
 * Health check endpoint for the onboarding service
 */
export const handleOnboardingHealth = async (req: Request, res: Response) => {
  try {
    const whatsappNumber = '593987644414';
    
    return res.status(200).json({
      status: 'healthy',
      service: 'simplified-onboarding',
      timestamp: new Date().toISOString(),
      whatsappNumber: whatsappNumber ? 'configured' : 'missing'
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      service: 'simplified-onboarding',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
