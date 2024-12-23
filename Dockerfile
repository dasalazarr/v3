# -----------------------
# Build stage
# -----------------------
FROM node:21-bullseye-slim as builder

WORKDIR /app

# Instalar pnpm globalmente
ENV PNPM_HOME=/usr/local/bin
RUN corepack enable && corepack prepare pnpm@latest --activate

# Instalar dependencias de compilación necesarias
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 1. Copiar archivos de configuración
COPY package.json pnpm-lock.yaml tsconfig.json rollup.config.js ./

# 2. Instalar todas las dependencias (incluyendo devDependencies)
RUN pnpm install

# 3. Copiar código fuente y assets
COPY src/ ./src/
COPY assets/ ./assets/

# 4. Construir la aplicación
RUN pnpm build

# -----------------------
# Production stage
# -----------------------
FROM node:21-bullseye-slim
WORKDIR /app

# Instalar pnpm
ENV PNPM_HOME=/usr/local/bin
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar archivos necesarios del builder
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets

# Instalar solo dependencias de producción
RUN pnpm install --prod

# Configuración de producción
ENV NODE_ENV=production
ENV PORT=3000

# Verificar que los archivos necesarios existen
RUN ls -la /app/dist && \
    test -f /app/dist/app.js

EXPOSE 3000
CMD ["node", "--enable-source-maps", "./dist/app.js"]
