# -----------------------
# Build stage
# -----------------------
FROM node:21-bullseye-slim as builder

WORKDIR /app

ENV PNPM_HOME=/usr/local/bin
RUN corepack enable && corepack prepare pnpm@latest --activate

# 1. Copiar archivos de configuración
COPY package.json tsconfig.json rollup.config.js ./

# 2. Instalar dependencias (en modo build)
RUN pnpm install

# 3. Copiar código fuente
COPY src/ ./src/

# 4. Copiar carpeta assets (IMPORTANTE para que el build la vea si la necesitas en build)
COPY assets/ ./assets/

# 5. Construir la aplicación
RUN pnpm build


# -----------------------
# Production stage
# -----------------------
FROM node:21-bullseye-slim
WORKDIR /app

ENV PNPM_HOME=/usr/local/bin
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiamos del builder:
COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist ./dist
# (OPCIONAL) Copiar también los assets originales.
# Esto es esencial si tu aplicación en runtime 
# necesita leer los archivos estáticos:
COPY --from=builder /app/assets ./assets

# Instalar solo dependencias de producción
RUN pnpm install --prod

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["node", "./dist/app.js"]
