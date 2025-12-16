# Render Deployment Guide

## Prerequisites

1. **MongoDB Atlas Account** (free M0 cluster)
   - Sign up at https://www.mongodb.com/cloud/atlas/register
   - Create free M0 cluster (512 MB)
   - Get connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>`

2. **GitHub Account**
   - Push this repository to GitHub if not already done

## Deployment Steps

### 1. Create Render Account

- Go to https://render.com
- Sign up with GitHub (no credit card required)

### 2. Connect Repository

- Click "New +" → "Web Service"
- Connect your GitHub account
- Select `investment-trading-portfolio` repository

### 3. Configure Service

**Basic Settings:**

- **Name**: `investment-trading-api` (or your preferred name)
- **Region**: Singapore (closest to Mumbai for low latency)
- **Branch**: `main` (or your default branch)
- **Runtime**: Node
- **Build Command**:
  ```bash
  pnpm install && pnpm build --filter=api...
  ```
- **Start Command**:
  ```bash
  cd apps/api && node dist/src/main.js
  ```

**Advanced Settings:**

- **Plan**: Free
- **Health Check Path**: `/health`
- **Auto-Deploy**: Yes (deploys on every push)

### 4. Environment Variables

Click "Environment" tab and add these:

```bash
NODE_ENV=production
PORT=10000

# MongoDB (get from Atlas)
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/trading-portfolio?retryWrites=true&w=majority

# Authentication (generate secret with: openssl rand -base64 32)
AUTH_SECRET=<your-secret-key-min-32-chars>
AUTH_APP_NAME=Investment Trading Platform
AUTH_APP_URL=https://your-app-name.onrender.com

# Optional: Redis (if using external Redis)
REDIS_URL=redis://default:password@host:port

# Optional: QuestDB (if deploying on Render)
QUESTDB_URL=http://localhost:9000
```

**Generate AUTH_SECRET:**

```bash
# On Windows PowerShell:
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# On Linux/Mac:
openssl rand -base64 32
```

### 5. Deploy

- Click "Create Web Service"
- Render will:
  1. Clone your repo
  2. Install dependencies with pnpm
  3. Build all packages (via Turbo)
  4. Start the API server
- **First deployment**: ~5-10 minutes
- **Subsequent deployments**: ~2-3 minutes

### 6. Get Your URL

After deployment succeeds:

- Your API will be live at: `https://your-app-name.onrender.com`
- Update `AUTH_APP_URL` environment variable with this URL
- Redeploy (click "Manual Deploy" → "Deploy latest commit")

### 7. Test Deployment

```bash
# Health check
curl https://your-app-name.onrender.com/health

# Should return:
# {"status":"ok","info":{"mongodb":{"status":"up"},...}}
```

## Important Notes

### ❄️ Cold Starts

- **Free tier spins down after 15 minutes of inactivity**
- First request after sleep: 30-60 seconds to wake up
- Acceptable for personal/development use
- To avoid: Upgrade to paid plan ($7/month) or use a cron job to ping every 14 minutes

### 📦 Build Performance

- Render provides 512 MB RAM for builds on free tier
- Turbo cache works but slower than Railway
- Average build time: 3-5 minutes

### 🔄 Auto-Deploy

- Pushes to `main` branch trigger automatic deployments
- Can disable in service settings if needed

### 📊 Monitoring

- View logs in real-time from Render dashboard
- Click "Logs" tab to see server output
- Health checks run every 30 seconds

## MongoDB Atlas Setup

1. Create free M0 cluster
2. **Network Access**:
   - Add IP: `0.0.0.0/0` (allow from anywhere)
   - Render uses dynamic IPs on free tier
3. **Database Access**:
   - Create user with read/write permissions
   - Note username and password
4. **Connection String**:
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```

## Troubleshooting

### Build Fails

```bash
# Check build logs in Render dashboard
# Common issues:
# 1. pnpm not found → Render auto-detects pnpm from package.json
# 2. TypeScript errors → Run `pnpm build --filter=api...` locally first
# 3. Missing dependencies → Ensure all workspace deps are listed
```

### App Crashes on Start

```bash
# Check runtime logs
# Common issues:
# 1. MongoDB connection failed → Check MONGODB_URI
# 2. Port binding error → Ensure using process.env.PORT
# 3. Missing env vars → Verify all required vars are set
```

### ES Module Errors (better-auth)

- ✅ **Render supports ES modules natively** (unlike Vercel serverless)
- Your current CommonJS + dynamic import setup works perfectly
- No additional configuration needed

## Cost Optimization

**Free Tier Limits:**

- ✅ 512 MB RAM
- ✅ 0.1 CPU
- ✅ 100 GB bandwidth/month (plenty for 2 users)
- ✅ 500 build minutes/month
- ⚠️ Spins down after 15 min inactivity

**To Prevent Spin Down (Free Methods):**

1. **UptimeRobot** (free service):
   - Monitor `https://your-app.onrender.com/health`
   - Ping every 5 minutes (max 50 monitors free)
   - Keeps app warm during trading hours

2. **Cron Job** (from your local Windows PC):
   ```powershell
   # Add to Windows Task Scheduler (runs 9 AM - 3:30 PM IST weekdays)
   Invoke-WebRequest -Uri "https://your-app.onrender.com/health" -Method GET
   ```

## Deployment Checklist

- [ ] MongoDB Atlas cluster created
- [ ] MongoDB connection string obtained
- [ ] GitHub repository pushed
- [ ] Render account created
- [ ] Web Service configured
- [ ] Environment variables set
- [ ] AUTH_SECRET generated
- [ ] First deployment successful
- [ ] Health check endpoint working
- [ ] AUTH_APP_URL updated with Render URL
- [ ] UptimeRobot monitoring configured (optional)

## Next Steps After Deployment

1. **Update Web App**:
   - Update API URL in `apps/web/.env` to point to Render
   - Deploy web app to Vercel (works fine for Next.js)

2. **Set Up CI/CD**:
   - Render auto-deploys on push to main
   - Add GitHub Actions for testing before deploy (optional)

3. **Monitor Performance**:
   - Use Render metrics dashboard
   - Set up error tracking (Sentry, etc.)

## Alternative: Railway (If Budget Allows)

If you can afford $1/month after 30-day trial:

- **No cold starts** (always on)
- **Better performance** (faster builds)
- **Can deploy MongoDB** (no external Atlas needed)
- **Private networking** between services

See `RAILWAY_DEPLOYMENT.md` for Railway setup.
