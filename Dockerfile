# Build stage
FROM node:21-bullseye-slim as builder

# Establecer el directorio de trabajo
WORKDIR /app

# Habilitar pnpm
ENV PNPM_HOME=/usr/local/bin
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar archivos de configuración
COPY package.json tsconfig.json rollup.config.js ./

# Instalar dependencias
RUN pnpm install

# Copiar código fuente
COPY src/ ./src/

# Construir la aplicación
RUN pnpm build

# Production stage
FROM node:21-bullseye-slim

WORKDIR /app

# Habilitar pnpm en producción
ENV PNPM_HOME=/usr/local/bin
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar solo los archivos necesarios del builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist ./dist

# Instalar solo dependencias de producción
RUN pnpm install --prod

# Configurar variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Exponer el puerto
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["node", "./dist/app.js"]