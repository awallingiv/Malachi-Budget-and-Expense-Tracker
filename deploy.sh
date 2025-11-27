#!/bin/bash

# ReactBudget Production Deployment Script

echo "🚀 Starting ReactBudget Production Deployment..."

# Check if .env.production exists
if [ ! -f "./backend/.env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create backend/.env.production with your production settings"
    exit 1
fi

# Check if production API URL is updated
if grep -q "your-api-domain.com" "./frontend/src/services/apiService.js"; then
    echo "⚠️  Warning: Please update the production API URL in frontend/src/services/apiService.js"
    echo "Replace 'your-api-domain.com' with your actual domain"
    exit 1
fi

# Build and deploy
echo "📦 Building applications..."

# Stop existing containers
docker-compose -f docker-compose.prod.yml down

# Build and start production containers
docker-compose -f docker-compose.prod.yml up --build -d

echo "✅ Deployment complete!"
echo "🌐 Frontend available at: http://localhost"
echo "🔗 Backend API at: http://localhost:3002"
echo "❤️  Health check: http://localhost:3002/health"

# Show container status
echo "📊 Container Status:"
docker-compose -f docker-compose.prod.yml ps