# Database Seeder Service Dockerfile
FROM node:18-alpine

# Install OpenSSL and compatibility libraries required by Prisma
RUN apk add --no-cache libc6-compat openssl3

WORKDIR /app

# Copy package files from the seeder service
COPY ./services/db-seeder/package*.json ./

# Install dependencies
RUN npm install --production

# Copy Prisma schema
COPY ./prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy the seeder source code
COPY ./services/db-seeder/ .

# Create non-root user for security and change ownership
RUN addgroup -g 1001 -S nodejs && \
    adduser -S seeder -u 1001 -G nodejs && \
    chown -R seeder:nodejs /app

USER seeder

# Default command - can be overridden
CMD ["node", "seed.js"]
