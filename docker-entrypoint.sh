#!/bin/sh
set -e

echo "Running Prisma db push..."
node ./node_modules/prisma/build/index.js db push --skip-generate 2>&1 || echo "Warning: prisma db push failed, tables may already exist"

echo "Starting server..."
exec node server.js
