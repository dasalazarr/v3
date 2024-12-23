# -----------------------
# Build stage
# -----------------------
FROM node:21-bullseye-slim as builder

WORKDIR /app

# Instalar pnpm y dependencias de sistema necesarias en una sola capa
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    python3-minimal \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copiar solo los archivos necesarios para la instalación de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias con cache optimizado
RUN pnpm install --frozen-lockfile

# Copiar archivos de configuración
COPY tsconfig.json rollup.config.js ./

# Copiar código fuente y assets
COPY src/ ./src/
COPY assets/ ./assets/

# Construir la aplicación
RUN pnpm build && \
    pnpm prune --prod

# -----------------------
# Production stage
# -----------------------
FROM node:21-bullseye-slim as production

WORKDIR /app

# Copiar solo los archivos necesarios
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/assets ./assets

# Configuración de producción
ENV NODE_ENV=production \
    PORT=3000

# Verificación de salud
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

EXPOSE ${PORT}

# Usar un usuario no root
RUN useradd -r -u 1001 -g root botuser && \
    chown -R botuser:root /app

USER botuser

CMD ["node", "--enable-source-maps", "./dist/app.js"]
