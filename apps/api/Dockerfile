FROM node:20-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init openssl ca-certificates && rm -rf /var/lib/apt/lists/*

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

# Fix ESM imports: add .js extensions to compiled shared output
# (Source files have no .js extensions for Metro/Expo compatibility,
#  but Node.js ESM requires them in the compiled JS output)
RUN find packages/shared/dist -name "*.js" -exec sed -i -E 's#(from "\.[^"]*)"#\1.js"#g' {} +

# Generate Prisma client + build API
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npx tsc

WORKDIR /app
ENV NODE_ENV=production
EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "apps/api/start.sh"]
