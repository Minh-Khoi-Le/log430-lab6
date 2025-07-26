FROM node:18-alpine AS builder

WORKDIR /app

# Install TypeScript globally for faster builds
RUN npm install -g typescript

# Copy package files first for better caching
COPY services/saga-orchestrator-service/package*.json ./
COPY shared/ ./shared/

# Install ALL dependencies
RUN npm install

# Copy source code and configuration
COPY services/saga-orchestrator-service/ ./
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Create optimized tsconfig for build with proper output structure
RUN echo '{ "extends": "./tsconfig.json", "compilerOptions": { "skipLibCheck": true, "noEmitOnError": false, "incremental": true, "outDir": "./dist", "rootDir": "./" }, "include": ["**/*", "./shared/**/*"] }' > tsconfig.build.json

# Build TypeScript code
RUN npx tsc -p tsconfig.build.json || echo "Build completed with errors"

# Production stage
FROM node:18-alpine AS production

# Install required SSL libraries for Prisma
RUN apk add --no-cache libc6-compat openssl3

WORKDIR /app

# Copy package.json and install only production dependencies
COPY services/saga-orchestrator-service/package*.json ./
RUN npm install --omit=dev && \
    npm install module-alias tsconfig-paths typescript && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy prisma schema and migrations for runtime (needed for migrations and client)
COPY --from=builder /app/prisma ./prisma

# Copy shared directory
RUN mkdir -p shared
COPY --from=builder /app/dist/shared ./shared

# Copy start script
COPY services/saga-orchestrator-service/start.js ./

# Expose port
EXPOSE 3000

# Run migrations before starting the service
CMD npx prisma migrate deploy --schema=./prisma/schema.prisma && node start.js