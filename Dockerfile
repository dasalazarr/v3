# STAGE 1: BUILDER
# This stage builds the app and creates a pruned production-ready folder.
FROM node:21-bullseye-slim AS builder

# Set up pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy dependency manifests to leverage Docker cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ ./apps/
COPY packages/ ./packages/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the entire project
RUN pnpm build

# Use pnpm to create a pruned production-only folder in /prod
# This folder will contain only the files needed to run the api-gateway
RUN pnpm --filter api-gateway deploy --prod /prod

# --------------------------------------------------------------------

# Stage 2: Production image
# This stage creates the final, lightweight image.
FROM node:21-bullseye-slim AS runner

# Set up pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
ENV NODE_ENV=production

# Copy the pruned production files from the 'builder' stage
COPY --from=builder /prod .

EXPOSE 3000

# The package.json in this directory now belongs to the api-gateway,
# so we can just run its start script.
# so we can just run its 'start' script.
CMD ["pnpm", "start"]