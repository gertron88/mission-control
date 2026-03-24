# Setup Guide

Complete setup instructions for Mission Control development environment.

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd mission-control

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials (see below)

# 4. Setup database
npx prisma generate
npx prisma migrate dev
npm run db:seed

# 5. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Detailed Setup

### 1. Prerequisites

- **Node.js** 18 or later ([download](https://nodejs.org))
- **npm** 9 or later (comes with Node.js)
- **Git**
- A **PostgreSQL** database (local or cloud)

### 2. Database Setup

#### Option A: Local PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb mission_control
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb mission_control
```

**Docker:**
```bash
docker run -d \
  --name mission-control-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mission_control \
  -p 5432:5432 \
  postgres:15
```

Connection string for local DB:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mission_control
```

#### Option B: Supabase (Cloud)

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings** → **Database** → **Connection string**
4. Choose **URI** format and copy the string
5. Replace `[YOUR-PASSWORD]` with your actual password

### 3. Environment Variables

Copy the example file:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the required values:

#### Required Variables

| Variable | How to Get | Example |
|----------|------------|---------|
| `DATABASE_URL` | From database setup above | `postgresql://...` |
| `NEXTAUTH_SECRET` | Generate random string | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your dev server URL | `http://localhost:3000` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App | See below |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App | See below |

#### GitHub OAuth Setup (for Authentication)

1. Go to [GitHub Settings → Developer Settings → OAuth Apps](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: Mission Control Dev
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**
5. Copy the **Client ID** to `GITHUB_CLIENT_ID`
6. Click **Generate a new client secret**
7. Copy the secret to `GITHUB_CLIENT_SECRET`

#### Discord Bot Setup (Optional but Recommended)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → Name it
3. Go to **Bot** → **Add Bot**
4. Enable **Privileged Gateway Intents**:
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT
5. Reset and copy **Token** to `DISCORD_BOT_TOKEN`
6. Generate OAuth2 URL with `bot` and `applications.commands` scopes
7. Invite bot to your test server

#### GitHub PAT Setup (for API Access)

1. Go to [GitHub Settings → Developer Settings → Tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Select scopes:
   - ☑️ `repo` (Full control of private repositories)
   - ☑️ `read:org` (Read org and team membership)
4. Generate and copy token to `GITHUB_PAT`

### 4. Database Initialization

```bash
# Generate Prisma client from schema
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev

# Seed with sample data (optional)
npm run db:seed
```

To verify database connection:
```bash
npx prisma db pull
```

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations (dev) |
| `npm run db:deploy` | Deploy migrations (production) |
| `npm run db:studio` | Open Prisma Studio (GUI for database) |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:reset` | Reset database and re-seed |

---

## Prisma Studio

Prisma Studio is a GUI for viewing and editing your database:

```bash
npx prisma studio
```

Opens at `http://localhost:5555`

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
npm run dev -- --port 3001
```

### Database Connection Errors

```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT 1"

# If using local PostgreSQL, ensure it's running
# macOS:
brew services start postgresql@15

# Linux:
sudo systemctl start postgresql
```

### Prisma Errors

```bash
# Reset Prisma client
rm -rf node_modules/.prisma
npx prisma generate

# Reset database completely
npx prisma migrate reset
```

### NextAuth Errors

- Ensure `NEXTAUTH_URL` is exactly `http://localhost:3000` (or your dev URL)
- `NEXTAUTH_SECRET` must be set (any random string works for dev)
- Check GitHub OAuth callback URL matches your `NEXTAUTH_URL`

---

## Next Steps

1. **Create your first agent** - Go to the Agents page and add an agent
2. **Set up Discord integration** - Configure your bot for chatops
3. **Create tasks** - Use the Kanban board to manage work
4. **Configure trading** - Add exchange API keys if using trading features

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.
