# Use Node.js LTS (Long Term Support) version
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat python3 make g++ 

WORKDIR /app

# Copy package files
COPY --chown=1001:1001 package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev dependencies)
COPY --chown=1001:1001 package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY --chown=1001:1001 . .
#RUN ls -lha /app/client/src/assets/
# Build the application
RUN npm run build


# Compile scripts to JavaScript for containerized migration jobs
# Bundle local code (including shared/*) but keep node_modules external
RUN npx esbuild scripts/provision-tenants.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/scripts/provision-tenants.js
RUN npx esbuild scripts/migrate-tenants.ts --sourcemap=inline --platform=node --packages=external --bundle --format=esm --outfile=dist/scripts/migrate-tenants.js
RUN npx esbuild scripts/validate-tenants.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/scripts/validate-tenants.js

# Migration stage with dev dependencies for drizzle-kit
FROM base AS migrator
WORKDIR /app

# Copy package files and install all dependencies (including dev dependencies)
COPY --chown=1001:1001 package.json package-lock.json* ./
RUN npm ci

# Copy necessary files for migrations
COPY --chown=1001:1001 drizzle.config.ts ./
COPY --chown=1001:1001 tsconfig.json* ./
COPY --chown=1001:1001 shared ./shared
COPY --chown=1001:1001 scripts ./scripts
COPY --chown=1001:1001 server ./server

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application from builder stage
COPY --from=builder --chown=1001:1001 /app/dist ./dist
COPY --from=builder --chown=1001:1001 /app/client/dist ./client/dist

# Copy package.json and production dependencies from deps stage
COPY --from=deps --chown=1001:1001 /app/node_modules ./node_modules
COPY --from=builder --chown=1001:1001 /app/package.json ./package.json

# Copy other necessary files
COPY --from=builder --chown=1001:1001 /app/shared ./shared
COPY --from=builder --chown=1001:1001 /app/public ./public

# Install netcat for health checks and database waiting (before switching to nodejs user)
RUN apk add --no-cache netcat-openbsd nano

# Copy entrypoint script
COPY --chown=1001:1001 docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Change ownership to nodejs user
#RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose the port the app runs on
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use entrypoint script
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start the application
CMD ["npm", "start"]