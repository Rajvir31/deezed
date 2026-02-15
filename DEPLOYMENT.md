# Deploying Deezed — Use from Anywhere with Expo Go

This guide gets your API running in the cloud so the mobile app works from any network via Expo Go.

---

## What You Need (all free tiers)

| Service | Purpose | Sign Up |
|---------|---------|---------|
| **Railway** | Hosts the API + Postgres | [railway.com](https://railway.com) |
| **Cloudflare R2** | Photo storage (replaces MinIO) | [cloudflare.com](https://dash.cloudflare.com) |
| **Clerk** | Auth (you already have this) | [clerk.com](https://clerk.com) |
| **OpenAI** | AI features (you already have this) | [platform.openai.com](https://platform.openai.com) |

**Estimated cost**: ~$5/month (Railway), everything else is free tier.

---

## Step 1: Push to GitHub

Railway deploys from a GitHub repo. If you haven't already:

```bash
git add .
git commit -m "Add deployment config"
git push origin main
```

---

## Step 2: Set Up Cloudflare R2 (photo storage)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2 Object Storage**
2. Click **Create bucket** → name it `deezed-photos`
3. Go to **R2** → **Manage R2 API Tokens** → **Create API token**
   - Permissions: **Object Read & Write**
   - Specify bucket: `deezed-photos`
4. Save these values — you'll need them:
   - **Account ID** (in the R2 overview page URL or sidebar)
   - **Access Key ID**
   - **Secret Access Key**
5. Your S3 endpoint will be: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

---

## Step 3: Deploy API to Railway

### 3a. Create the project

1. Go to [railway.com](https://railway.com) and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo** → select your `deezed` repo
3. Railway will detect the `railway.json` and Dockerfile automatically

### 3b. Add a Postgres database

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Click on the Postgres service → **Variables** tab → copy the `DATABASE_URL`

### 3c. Set environment variables

Click on your API service → **Variables** tab → **Raw Editor**, and paste:

```env
DATABASE_URL=<paste the Railway Postgres URL from step 3b>
CLERK_SECRET_KEY=<your Clerk secret key>
CLERK_PUBLISHABLE_KEY=<your Clerk publishable key>
OPENAI_API_KEY=<your OpenAI API key>
OPENAI_MODEL=gpt-4o
S3_ENDPOINT=https://<YOUR_CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com
S3_ACCESS_KEY=<your R2 Access Key ID>
S3_SECRET_KEY=<your R2 Secret Access Key>
S3_BUCKET=deezed-photos
S3_REGION=auto
NODE_ENV=production
API_HOST=0.0.0.0
API_PORT=3001
```

### 3d. Expose the API publicly

1. Click on your API service → **Settings** → **Networking**
2. Click **Generate Domain** — you'll get something like `deezed-api-production.up.railway.app`
3. Set the port to `3001`

### 3e. Deploy

Railway auto-deploys on push. You can also trigger a manual deploy from the dashboard.
Check the deploy logs — you should see:
```
==> Running database migrations...
==> Seeding exercise library...
==> Starting Deezed API...
🚀 Deezed API running at http://0.0.0.0:3001
```

### 3f. Verify

Open your browser and go to:
```
https://your-app.up.railway.app/health
```
You should see: `{"status":"ok","timestamp":"..."}`

---

## Step 4: Point the Mobile App to Your Cloud API

Update your `.env` file locally:

```env
EXPO_PUBLIC_API_URL=https://your-app.up.railway.app
```

That's it! Now when you run the mobile app with Expo Go, it talks to the cloud API instead of localhost.

---

## Step 5: Run the App with Expo Go

```bash
# From the project root
npm run dev:mobile
```

Scan the QR code with Expo Go on your phone. The app now works from **any Wi-Fi or cellular network** because the API is in the cloud.

---

## What's Running Where (after deployment)

```
Your Phone (Expo Go)
  │
  │  HTTPS
  ▼
Railway (cloud)
  ├── Fastify API ───── Railway Postgres
  │
  └── Cloudflare R2 (photo storage)
  
  + Clerk (auth, already cloud)
  + OpenAI (AI, already cloud)
```

**You only run locally**: `npm run dev:mobile` (Expo dev server)

**Everything else is in the cloud**: API, database, storage, auth, AI.

---

## Troubleshooting

### "Network request failed" on phone
- Make sure `EXPO_PUBLIC_API_URL` is set to your Railway URL (with `https://`)
- Restart the Expo dev server after changing env vars: `npm run dev:mobile`

### Railway deploy fails
- Check the deploy logs in the Railway dashboard
- Make sure all required env vars are set (especially `DATABASE_URL`)
- The `DATABASE_URL` from Railway Postgres should start with `postgresql://`

### Clerk auth not working
- Make sure you're using the same Clerk app (same publishable key) in both the mobile `.env` and Railway env vars
- The `CLERK_SECRET_KEY` in Railway must match the `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` used in the mobile app (same Clerk project)

### Photos not uploading
- Verify your R2 bucket name matches `S3_BUCKET`
- Check that R2 API token has read+write permissions
- `S3_REGION` should be `auto` for Cloudflare R2
