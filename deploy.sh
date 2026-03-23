#!/bin/bash

# Mission Control Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Mission Control Deployment"
echo "=============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo ""
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo "${GREEN}✅ Node.js $(node --version)${NC}"
echo "${GREEN}✅ npm $(npm --version)${NC}"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build application
echo ""
echo "🏗️ Building application..."
npm run build

# Check for required environment variables
echo ""
echo "🔍 Checking environment variables..."

if [ -z "$DATABASE_URL" ]; then
    echo "${YELLOW}⚠️ DATABASE_URL not set - will use Vercel env${NC}"
else
    echo "${GREEN}✅ DATABASE_URL is set${NC}"
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
    echo "${YELLOW}⚠️ NEXTAUTH_SECRET not set - will use Vercel env${NC}"
else
    echo "${GREEN}✅ NEXTAUTH_SECRET is set${NC}"
fi

# Deploy to Vercel
echo ""
echo "🚀 Deploying to Vercel..."

if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm i -g vercel
fi

# Deploy production
vercel --prod --yes

echo ""
echo "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Run database migrations: npx prisma migrate deploy"
echo "2. Seed database: npm run db:seed"
echo "3. Configure Discord webhook in Vercel dashboard"
echo "4. Set up agent API keys"
