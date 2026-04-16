#!/bin/bash
# Setup Redis for Mission Control
# Run: ./scripts/setup-redis.sh

echo "Setting up Upstash Redis for Mission Control..."
echo ""
echo "1. Go to https://console.upstash.com/redis"
echo "2. Create a new Redis database (Free tier works)"
echo "3. Copy the Redis URL (starts with redis:// or rediss://)"
echo ""
echo "Then add to Vercel:"
echo "  vercel env add REDIS_URL"
echo ""
echo "Or set in Vercel Dashboard:"
echo "  Project Settings > Environment Variables"
echo "  Name: REDIS_URL"
echo "  Value: redis://default:...@...-upstash.io:6379"
echo ""
echo "After setting REDIS_URL, redeploy:"
echo "  vercel --prod"
