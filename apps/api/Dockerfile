FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache dumb-init

# Copy workspace package manifests for dependency caching
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all dependencies (including dev for build tooling + tsx for seed)
RUN npm install

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Build shared package first (API depends on it)
RUN npm run build --workspace=packages/shared

# Generate Prisma client + build API
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npx tsc

WORKDIR /app
ENV NODE_ENV=production
EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "apps/api/start.sh"]
