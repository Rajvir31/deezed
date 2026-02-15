#!/bin/sh
set -e

cd /app/apps/api

echo "==> Running database migrations..."
npx prisma migrate deploy

echo "==> Seeding exercise library..."
npx tsx prisma/seed.ts

echo "==> Starting Deezed API..."
node dist/index.js
