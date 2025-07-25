FROM node:18-alpine

WORKDIR /app

# Install system dependencies needed by Prisma
RUN apk add --no-cache libc6-compat openssl3

# Copy package files and install dependencies (prisma locally, not globally)
COPY package*.json ./
RUN npm install

# Copy Prisma schema and migration files
COPY prisma ./prisma


# Add a script to check for the Prisma schema file and run migration
RUN echo '#!/bin/sh\n\
echo "Looking for prisma schema at $(pwd)/prisma/schema.prisma"\n\
ls -la /app\n\
ls -la /app/prisma || echo "prisma directory not found"\n\
if [ -f /app/prisma/schema.prisma ]; then\n\
  echo "Found schema file, running prisma migrate deploy"\n\
  npx prisma migrate deploy\n\
else\n\
  echo "ERROR: Could not find prisma/schema.prisma"\n\
  exit 1\n\
fi' > /app/run-migrate.sh && chmod +x /app/run-migrate.sh

# Expose command to be overridden
CMD ["/app/run-migrate.sh"]
