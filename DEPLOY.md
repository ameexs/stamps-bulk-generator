# STAMPS Bulk Generator - Deployment Guide

## Deploy to Railway (Recommended - Free Tier)

### Step 1: Create GitHub Repository
```bash
cd c:\Users\HP\.gemini\antigravity\scratch\stamps-bulk-generator
git init
git add .
git commit -m "Initial commit - STAMPS Bulk Generator"
```

Then push to GitHub:
1. Go to https://github.com/new
2. Create a new repository (e.g., "stamps-bulk-generator")
3. Follow the instructions to push your code

### Step 2: Deploy on Railway
1. Go to https://railway.app and sign up (free with GitHub)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Node.js and deploy!
5. Click "Generate Domain" to get your public URL

Your app will be live at something like: `https://stamps-bulk-generator.up.railway.app`

---

## Alternative: Deploy to Render (Also Free)

1. Go to https://render.com and sign up
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click "Create Web Service"

---

## Alternative: Deploy to Vercel

> ⚠️ Vercel is better for static sites, but works for simple Node.js apps

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` in the project folder
3. Follow the prompts

---

## Environment Variables (Optional)

No environment variables are required for basic operation.

## Notes

- The app uses in-memory file processing (no persistent storage needed)
- Files are processed client-side - no sensitive data leaves the browser
- Generated XML files download directly to user's browser
