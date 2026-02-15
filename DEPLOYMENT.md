# Deploying Deezed — Free Cloud Setup with Expo Go

Everything here is free. No credit card required for Render or Neon.

---

## Services You'll Need

| Service | Purpose | Cost | Sign Up |
|---------|---------|------|---------|
| **Render** | Hosts the API | Free (750 hrs/mo) | [render.com](https://render.com) |
| **Neon** | Postgres database | Free (0.5 GB, never expires) | [neon.tech](https://neon.tech) |
| **Cloudflare R2** | Photo storage | Free (10 GB) | [cloudflare.com](https://dash.cloudflare.com) |
| **Clerk** | Auth (you already have this) | Free (10k users) | [clerk.com](https://clerk.com) |
| **OpenAI** | AI features (you already have this) | ~$0.01/request | [platform.openai.com](https://platform.openai.com) |

> **Note**: Render's free tier sleeps after 15 min of inactivity. First request after idle
> takes ~30-60 seconds. After that it's fast. Perfectly fine for dev/personal use.
> When you're ready for production, just switch to Render's paid plan ($7/mo) or Railway.

---

## Step 1: Push to GitHub

Render deploys from GitHub. If you haven't already:

```bash
git add .
git commit -m "Add deployment config"
git push origin main
```

---

## Step 2: Set Up Neon Postgres (free database)

1. Go to [neon.tech](https://neon.tech) and sign up (GitHub login works)
2. Click **Create Project** → name it `deezed`
3. Pick a region close to you
4. Once created, copy the **Connection string** — it looks like:
   ```
   postgresql://neondb_owner:abc123@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this — it's your `DATABASE_URL`

---

## Step 3: Set Up Cloudflare R2 (free photo storage)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2 Object Storage**
2. Click **Create bucket** → name it `deezed-photos`
3. Go to **R2** → **Manage R2 API Tokens** → **Create API token**
   - Permissions: **Object Read & Write**
   - Specify bucket: `deezed-photos`
4. Save these values:
   - **Account ID** (visible in the sidebar or URL)
   - **Access Key ID**
   - **Secret Access Key**
5. Your S3 endpoint is: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

---

## Step 4: Deploy API to Render (free)

### 4a. Create the web service

1. Go to [render.com](https://render.com) and sign up with GitHub
2. Click **New** → **Web Service**
3. Connect your GitHub repo → select `deezed`
4. Render will detect the `render.yaml` automatically
   - If it asks manually:
     - **Environment**: Docker
     - **Dockerfile Path**: `./apps/api/Dockerfile`
     - **Docker Context**: `.`
     - **Plan**: Free

### 4b. Set environment variables

Go to your service → **Environment** tab → add these:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Neon connection string from Step 2 |
| `CLERK_SECRET_KEY` | Your Clerk secret key |
| `CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o` |
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY` | Your R2 Access Key ID |
| `S3_SECRET_KEY` | Your R2 Secret Access Key |
| `S3_BUCKET` | `deezed-photos` |
| `S3_REGION` | `auto` |
| `NODE_ENV` | `production` |
| `API_HOST` | `0.0.0.0` |
| `API_PORT` | `3001` |

### 4c. Deploy

Click **Manual Deploy** → **Deploy latest commit** (or it auto-deploys on push).

Watch the logs — you should see:
```
==> Running database migrations...
==> Seeding exercise library...
==> Starting Deezed API...
🚀 Deezed API running at http://0.0.0.0:3001
```

### 4d. Get your URL

Render gives you a free URL like:
```
https://deezed-api.onrender.com
```

Verify it works by visiting: `https://deezed-api.onrender.com/health`

You should see: `{"status":"ok","timestamp":"..."}`

---

## Step 5: Point Mobile App to Cloud API

Update your local `.env` file:

```env
EXPO_PUBLIC_API_URL=https://deezed-api.onrender.com
```

---

## Step 6: Run the App

```bash
npm run dev:mobile
```

Scan the QR code with Expo Go. The app now works from **any network** — Wi-Fi, cellular, anywhere.

---

## What's Running Where

```
Your Phone (Expo Go)
  │
  │  HTTPS
  ▼
Render (free)
  └── Fastify API
        ├── Neon Postgres (free)
        ├── Cloudflare R2 (free)
        ├── Clerk Auth (free)
        └── OpenAI API (pay-per-use)
```

**On your laptop**: Only `npm run dev:mobile` (Expo dev server)
**In the cloud**: Everything else

---

## Upgrading Later

When your app is ready for production, you just need to:

1. **Render** → Switch to Starter plan ($7/mo) — no cold starts, always on
2. **Neon** → Scale plan ($19/mo) — more storage, more compute
3. Or migrate to **Railway** ($5/mo) — great alternative, always on

No code changes needed. Just swap the plan and optionally update env vars.

---

## Troubleshooting

### First request is slow (~30-60 seconds)
This is normal on Render's free tier. The service sleeps after 15 min of inactivity.
Subsequent requests are fast.

### "Network request failed" on phone
- Make sure `EXPO_PUBLIC_API_URL` is set to your Render URL (with `https://`)
- Restart Expo after changing env vars: stop and re-run `npm run dev:mobile`

### Render deploy fails
- Check deploy logs in the Render dashboard
- Make sure all env vars are set (especially `DATABASE_URL`)
- The Neon `DATABASE_URL` must include `?sslmode=require` at the end

### Clerk auth not working
- Same Clerk project for both: `CLERK_SECRET_KEY` on Render must match
  `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in your mobile `.env`

### Photos not uploading
- Verify R2 bucket name matches `S3_BUCKET`
- R2 API token needs read+write permissions
- `S3_REGION` should be `auto` for Cloudflare R2

### Database errors
- Neon connection strings need `?sslmode=require` — make sure it's there
- If you see "relation does not exist", the migrations didn't run. Trigger a redeploy.
