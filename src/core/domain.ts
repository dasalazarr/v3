/**
 * Enum que define los dominios soportados por el sistema
 */
export enum DOMAIN {
  DEFAULT = 'default',
  DENTAL = 'dental',
  DERMATOLOGIA = 'dermatologia',
  MUNICIPAL = 'municipal',
  EDUCACION = 'educacion',
  EVENTOS = 'eventos',
  PROYECTOS = 'proyectos',
  ARQUITECTURA = 'arquitectura' // Añadido dominio de arquitectura
}

/**
 * Verifica si un valor dado es un dominio válido
 */
export function isDomain(value: any): value is DOMAIN {
  return Object.values(DOMAIN).includes(value);
}

/**
 * Devuelve un dominio por su nombre, o el dominio por defecto si no existe
 */
export function getDomainByName(name: string): DOMAIN {
  const domainName = name.toLowerCase();
  return isDomain(domainName) ? domainName as DOMAIN : DOMAIN.DEFAULT;
}

/**
 * Determina el dominio basado en el contenido del mensaje
 * Este es un detector simple basado en palabras clave
 */
export function detectDomain(message: string): DOMAIN {
  message = message.toLowerCase();
  
  // Palabras clave para detectar el dominio de arquitectura
  const arquitecturaKeywords = [
    'arquitectura', 'plano', 'diseño de casa', 'proyecto arquitectónico',
    'construcción', 'residencial', 'edificio', 'estudio de arquitectura',
    'arquia', 'visita técnica', 'diseño interior'
  ];
  
  if (arquitecturaKeywords.some(keyword => message.includes(keyword))) {
    return DOMAIN.ARQUITECTURA;
  }
  
  // Lógica para otros dominios aquí
  
  return DOMAIN.DEFAULT;
}
