# Deployment Guide

Deploy Mission Control to production.

## Quick Deploy (Vercel)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod
```

## Prerequisites

Before deploying, ensure you have:

- [ ] Production database (Supabase, Railway, AWS RDS, etc.)
- [ ] GitHub OAuth App configured for production domain
- [ ] Discord Bot token and webhook URLs
- [ ] GitHub PAT with required scopes
- [ ] Domain name (optional but recommended)

---

## Platform-Specific Guides

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import Project**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Select **Next.js** framework preset

3. **Environment Variables**
   
   Add these in Vercel Dashboard → Project → Settings → Environment Variables:
   
   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Your production database URL |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | `https://your-domain.vercel.app` |
   | `GITHUB_CLIENT_ID` | Your GitHub OAuth App ID |
   | `GITHUB_CLIENT_SECRET` | Your GitHub OAuth App Secret |
   | `DISCORD_BOT_TOKEN` | Your Discord bot token |
   | `DISCORD_WEBHOOK_URL` | Your Discord webhook URL |
   | `GITHUB_PAT` | Your GitHub Personal Access Token |

4. **Deploy**
   ```bash
   vercel --prod
   ```

5. **Database Migrations**
   ```bash
   # Connect to production database and run migrations
   npx prisma migrate deploy
   ```

### Railway

1. **Create Project**
   ```bash
   npm i -g @railway/cli
   railway login
   railway init
   ```

2. **Add PostgreSQL**
   ```bash
   railway add --database postgres
   ```

3. **Environment Variables**
   ```bash
   railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
   railway variables set NEXTAUTH_URL=https://your-app.up.railway.app
   # ... set other variables
   ```

4. **Deploy**
   ```bash
   railway up
   ```

### Docker (Self-Hosted)

1. **Create Dockerfile** (if not exists)

2. **Build Image**
   ```bash
   docker build -t mission-control .
   ```

3. **Run Container**
   ```bash
   docker run -d \
     --name mission-control \
     -p 3000:3000 \
     -e DATABASE_URL=postgresql://... \
     -e NEXTAUTH_SECRET=... \
     -e NEXTAUTH_URL=https://your-domain.com \
     # ... other env vars \
     mission-control
   ```

### AWS (ECS/Fargate)

See [AWS Deployment Guide](#aws-deployment) below.

---

## Database Migration

### Option 1: CLI (Recommended)

```bash
# Set production database URL temporarily
export DATABASE_URL="your-production-database-url"

# Deploy migrations
npx prisma migrate deploy

# Verify
npx prisma db pull
```

### Option 2: CI/CD Pipeline

Add to your GitHub Actions workflow:

```yaml
- name: Deploy Database Migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Option 3: Vercel Post-Deploy Hook

Create a script that runs migrations after deploy:

```bash
# scripts/migrate.sh
#!/bin/bash
npx prisma migrate deploy
```

---

## Post-Deployment Checklist

- [ ] **Health Check** - Visit `/api/health` (should return 200 OK)
- [ ] **Database Connection** - Verify data loads correctly
- [ ] **Authentication** - Test GitHub OAuth login
- [ ] **Discord Bot** - Verify bot is online and responsive
- [ ] **GitHub API** - Test repository access
- [ ] **Webhooks** - Verify Discord notifications work
- [ ] **Environment Variables** - Confirm all are set correctly

---

## Security Checklist

- [ ] `NEXTAUTH_SECRET` is a strong, unique random string
- [ ] Database uses SSL connection (`sslmode=require` or `ssl=true`)
- [ ] GitHub OAuth callback URL matches production domain
- [ ] Discord bot token is kept secret
- [ ] GitHub PAT has minimum required scopes
- [ ] `.env.local` is in `.gitignore`
- [ ] No secrets in logs or error messages
- [ ] CORS configured for your domain only

---

## Domain Configuration

### Custom Domain (Vercel)

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your domain
3. Configure DNS records as instructed

### SSL/HTTPS

Vercel, Railway, and most modern platforms provide SSL automatically.

For self-hosted:
```bash
# Using Let's Encrypt with Caddy
caddy reverse-proxy --from your-domain.com --to :3000

# Or use Traefik, Nginx, etc.
```

---

## Monitoring & Logs

### Vercel

- Dashboard: Functions tab shows serverless function logs
- Integrations: Add Sentry, Logflare, etc.

### Self-Hosted

```bash
# View Docker logs
docker logs -f mission-control

# Or use systemd journal
journalctl -u mission-control -f
```

### Recommended Monitoring Stack

- **Error Tracking**: Sentry ([sentry.io](https://sentry.io))
- **Uptime**: UptimeRobot or Pingdom
- **Analytics**: Plausible or Google Analytics
- **Database**: Supabase dashboard or pgAdmin

---

## Updating Production

### Git-Based Deploy (Vercel/Railway)

```bash
# Make changes
git add .
git commit -m "fix: update trading algorithm"
git push origin main

# Auto-deploys via Git integration
```

### Manual Deploy

```bash
# Vercel
vercel --prod

# Railway
railway up

# Docker
docker build -t mission-control:latest .
docker stop mission-control
docker rm mission-control
docker run -d --name mission-control -p 3000:3000 mission-control:latest
```

---

## Rollback

### Database Rollback

```bash
# View migration history
npx prisma migrate status

# Rollback specific migration
npx prisma migrate resolve --rolled-back "20240101120000_migration_name"
```

### Application Rollback (Vercel)

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click **...** → **Promote to Production**

---

## Troubleshooting

### Build Failures

```bash
# Test build locally
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Check Prisma generation
npx prisma generate
```

### Database Connection Issues

- Verify `DATABASE_URL` format: `postgresql://user:pass@host:5432/dbname`
- Ensure database allows connections from your deployment IP
- Check SSL requirements (add `?sslmode=require` if needed)

### Authentication Not Working

- Verify `NEXTAUTH_URL` matches your actual domain
- Check GitHub OAuth callback URL configuration
- Ensure `NEXTAUTH_SECRET` is set

### Discord Bot Offline

- Verify `DISCORD_BOT_TOKEN` is correct
- Check bot permissions in Discord server
- Ensure bot is added to your server

---

## AWS Deployment

### ECS with Fargate

1. **Create ECR Repository**
   ```bash
   aws ecr create-repository --repository-name mission-control
   ```

2. **Build and Push Docker Image**
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin YOUR_ECR_URL
   docker build -t mission-control .
   docker tag mission-control:latest YOUR_ECR_URL/mission-control:latest
   docker push YOUR_ECR_URL/mission-control:latest
   ```

3. **Create ECS Task Definition**
   - Use Fargate launch type
   - Set container image to your ECR URL
   - Configure environment variables
   - Set port mapping to 3000

4. **Create ECS Service**
   - Use Application Load Balancer
   - Configure auto-scaling

5. **Database**
   - Use RDS PostgreSQL
   - Place in same VPC as ECS tasks

---

## Support

- **Issues**: Open a GitHub issue
- **Discord**: Join our community server
- **Docs**: See README.md and SETUP.md
