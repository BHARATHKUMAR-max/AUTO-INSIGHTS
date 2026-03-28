# 🚀 Deploying to Vercel

This project is fully compatible with Vercel. Follow these steps to deploy your AI Insights platform.

### 1. Prepare your Repository
Ensure your code is pushed to a GitHub, GitLab, or Bitbucket repository.

### 2. Import to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New"** > **"Project"**.
3. Import your repository.

### 3. Configure Project Settings
Vercel will automatically detect the Vite project, but you need to ensure the following settings are correct:

- **Framework Preset**: Other (or Vite)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4. Add Environment Variables 🔑
This is the most important step. In the Vercel project settings, go to **Environment Variables** and add the following:

| Key | Value |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase Service Role Key |
| `GROQ_API_KEY` | Your Groq API Key |

### 5. Deploy
Click **"Deploy"**. Vercel will build your frontend and set up your Express server as a Serverless Function.

---

### ⚠️ Important Notes for Vercel
1. **Serverless Limits**: Vercel runs your `server.ts` as a Serverless Function. On the free plan, functions have a **10-second timeout**. If your data analysis (Groq AI call) takes longer than 10 seconds, the request might fail.
2. **Cold Starts**: The first request after some inactivity might be slightly slower as the serverless function "wakes up".
3. **Database Migrations**: Remember to run the SQL migrations in your Supabase SQL Editor (found in `README.md`) before your first deployment.

### Alternative Deployment (Recommended for heavy AI tasks)
If you find that Vercel's 10-second timeout is too short for your AI analysis, I recommend using **Render** or **Railway**. They support long-running processes and will work perfectly with your current `npm run dev` / `npm start` structure without any timeouts.
