import dotenv from 'dotenv';
dotenv.config();

/**
 * Archivo de configuración centralizado.
 *
 * Este archivo solo reexporta la configuración y tipos desde src/config/index.ts.
 * Toda la lógica de validación, obtención y tipado de variables de entorno debe estar en src/config/index.ts.
 * Si necesitas agregar o modificar variables de entorno, hazlo únicamente en src/config/index.ts.
 */

export { config } from './config/index';
export type { Config } from './config/index';
