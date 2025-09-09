# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for TypeScript)
RUN yarn install --frozen-lockfile

# Copy source code
COPY src ./src

# Build the application
RUN yarn build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install only production dependencies
RUN yarn install --production --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy .env file if it exists
COPY .env* ./

# Expose the port the app runs on
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]