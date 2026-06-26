# Vercel Deployment Guide

## Issues Fixed
✅ Updated `vercel.json` to use modern Vercel configuration
✅ Moved `better-sqlite3` to devDependencies (native modules don't work on Vercel)
✅ Created `.vercelignore` file
✅ Updated build command

## Next Steps to Deploy Successfully

### Option 1: Use Vercel Blob Storage (Recommended for Simple Setup)
1. Install Vercel Blob Storage SDK:
   ```bash
   npm install @vercel/blob
   ```

2. Replace your database queries with Blob storage in your API routes

### Option 2: Use a Cloud Database (Recommended for Complex Apps)
Choose one:

**PostgreSQL (Recommended)**
- Supabase (free tier available) - https://supabase.com
- Neon - https://neon.tech
- Railway - https://railway.app

**MongoDB**
- MongoDB Atlas - https://www.mongodb.com/cloud/atlas

### Setup Instructions:

1. **Initialize Git Repository** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

3. **Connect to Vercel**:
   - Go to https://vercel.com
   - Sign in with GitHub
   - Click "New Project"
   - Select your repository
   - Framework: Select "Vite"
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Click Deploy

4. **Add Environment Variables** (in Vercel Dashboard):
   - Project Settings > Environment Variables
   - Add your `GEMINI_API_KEY` and database credentials
   - Redeploy

## Important Notes
- ❌ The `server.ts` file won't run on Vercel (Express server not supported)
- ❌ `better-sqlite3` cannot be used in production on Vercel
- ✅ Your React frontend will deploy as a static site
- ✅ API routes in `/api` folder will work as serverless functions

## Troubleshooting
If you still get deployment errors:
1. Check Vercel build logs in the dashboard
2. Ensure all dependencies are correctly listed
3. Make sure environment variables are set
4. Check that your API routes don't use `better-sqlite3` in production
