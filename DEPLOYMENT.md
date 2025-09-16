# QuantaView Railway Deployment Guide

## Prerequisites
1. GitHub account
2. Railway account (signup at railway.app)
3. Your code pushed to a GitHub repository

## Step 1: Prepare Your Repository

Make sure you have these files in your project:

### Backend files (in `/backend` folder):
- ✅ `requirements.txt` - Python dependencies
- ✅ `Procfile` - Railway start command
- ✅ `main.py` - FastAPI application
- ✅ `database.py` - Database configuration

### Root files:
- ✅ `railway.toml` - Railway configuration
- ✅ `.env.example` - Environment variables template

## Step 2: Deploy to Railway

### Option A: Railway CLI (Recommended)
1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Deploy from your project root:
   ```bash
   railway link
   railway up
   ```

### Option B: Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Choose your QuantaView repository
5. Railway will auto-detect and deploy both services

## Step 3: Set Up Database

1. In Railway dashboard, add a PostgreSQL database:
   - Click "Add Service" → "Database" → "PostgreSQL"
   - Railway will automatically create `DATABASE_URL` environment variable

## Step 4: Configure Environment Variables

In Railway dashboard, set these environment variables for your **backend service**:

```
ENVIRONMENT=production
FRONTEND_URL=https://your-frontend-url.railway.app
```

For your **frontend service**:
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.railway.app
```

## Step 5: Update URLs

1. **Get your Railway URLs** from the dashboard (something like):
   - Backend: `https://backend-production-abc123.up.railway.app`
   - Frontend: `https://frontend-production-def456.up.railway.app`

2. **Update environment variables** with actual URLs:
   - Backend `FRONTEND_URL` = your frontend Railway URL
   - Frontend `NEXT_PUBLIC_BACKEND_URL` = your backend Railway URL

3. **Update EA Integration Guide** (optional):
   - Edit `src/components/EAIntegrationGuide.tsx` line 33
   - Replace `"https://your-backend.railway.app"` with your actual backend URL

## Step 6: Run Database Migrations

If you have database migrations, run them:

```bash
railway run python backend/alembic upgrade head
```

## Step 7: Test Your Deployment

1. Visit your frontend URL
2. Try creating an API key
3. Test the EA integration with your MT4/MT5

## Troubleshooting

### Common Issues:

1. **Build fails**: Check logs in Railway dashboard
2. **Database connection fails**: Ensure `DATABASE_URL` is set
3. **CORS errors**: Verify `FRONTEND_URL` environment variable
4. **API calls fail**: Check `NEXT_PUBLIC_BACKEND_URL` is correct

### Useful Railway Commands:

```bash
railway logs                 # View logs
railway shell               # Access shell
railway status              # Check service status
railway variables set KEY=value  # Set environment variables
```

## Cost Estimation

Railway pricing (as of 2024):
- **Hobby Plan**: $5/month per service
- **PostgreSQL**: ~$5/month
- **Total**: ~$15/month for both services + database

Free tier available with limitations.

## Production Checklist

- [ ] Environment variables set correctly
- [ ] Database migrations run
- [ ] CORS configured for production domain
- [ ] API key creation working
- [ ] EA integration guide updated with production URL
- [ ] SSL certificates working (Railway handles this automatically)

Your QuantaView application should now be fully deployed and accessible via your Railway URLs!