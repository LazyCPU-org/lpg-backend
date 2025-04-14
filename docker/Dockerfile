# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built app from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db ./src/db

# Copy docker entrypoint script
COPY src/docker/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Set entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Default command
CMD ["npm", "start"]