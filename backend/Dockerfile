# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

#Need this for health check (dont have curl)
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S malachi -u 1001

# Change ownership of the app directory
RUN chown -R malachi:nodejs /app
USER malachi

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start the application
CMD ["npm", "start"]