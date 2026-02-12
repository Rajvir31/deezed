# How to Start the Deezed App

Follow these steps in order. **One-time setup** is only needed the first time (or after pulling changes that affect DB or env). **Every time** is what you do each time you want to run the app.

---

## Prerequisites

- **Node.js** 20 or newer
- **Docker Desktop** installed and running
- **Clerk** account → [dashboard.clerk.com](https://dashboard.clerk.com) (get API keys)
- **OpenAI** API key → [platform.openai.com](https://platform.openai.com)

---

## One-time setup

### 1. Open the project

```bash
cd C:\Users\Rajvir\Desktop\deezed
```

### 2. Environment file

- Copy `.env.example` to `.env` (in the **root** of the repo).
- Open `.env` and set:
  - `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` (from Clerk dashboard → API Keys).
  - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` = same value as `CLERK_PUBLISHABLE_KEY`.
  - `OPENAI_API_KEY` (from OpenAI).
- Copy `.env` into `apps/api/` as well (so Prisma and the API can read it):

  ```bash
  copy .env apps\api\.env
  ```

### 3. Start Docker (Postgres + MinIO)

```bash
docker compose up -d
```

Wait until both containers are up (e.g. `deezed-postgres`, `deezed-minio`).

### 4. Install dependencies

From the **repo root**:

```bash
npm install --legacy-peer-deps
```

### 5. Build the shared package

```bash
cd packages\shared
npm run build
cd ..\..
```

### 6. Database (Prisma)

From the **repo root**:

```bash
cd apps\api
npx prisma generate
npx prisma migrate dev --name init
cd ..\..
```

### 7. Seed the database (exercises)

From the **repo root**:

```bash
npm run db:seed
```

You should see: `Seeded 37 exercises.`

### 8. (Optional) Run on a physical phone

If you will use **Expo Go on your phone** (same Wi‑Fi as your PC):

- Find your PC’s IP (e.g. run `ipconfig` and note the IPv4 for your Wi‑Fi adapter, e.g. `10.0.0.215`).
- In **root** `.env` and in `apps/api/.env`, set:

  ```env
  EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3001
  ```

  Example: `EXPO_PUBLIC_API_URL=http://10.0.0.215:3001`

---

## Every time you start the app

You need **two terminals**: one for the API, one for the mobile app.

### Terminal 1 — API

From the **repo root**:

```bash
cd C:\Users\Rajvir\Desktop\deezed
npm run dev:api
```

Wait until you see: `Deezed API running at http://0.0.0.0:3001`. Leave this running.

### Terminal 2 — Mobile app (Expo)

Open a **new** terminal. From the **repo root**:

```bash
cd C:\Users\Rajvir\Desktop\deezed
npm run dev:mobile
```

- A browser tab may open with Expo DevTools.
- In the terminal you’ll see a **QR code** and “Waiting on http://localhost:8081”.

**On your phone:**

1. Install **Expo Go** (App Store / Play Store).
2. Make sure the phone is on the **same Wi‑Fi** as your PC.
3. **iOS:** open the Camera app and scan the QR code from the terminal.
4. **Android:** open Expo Go and scan the QR code from the terminal.

The app should load. Sign up or sign in with Clerk, then go through onboarding.

---

## If something goes wrong

| Problem | What to do |
|--------|------------|
| `EADDRINUSE: port 3001` | Something else is using 3001. Stop that process or run: `Get-NetTCPConnection -LocalPort 3001 \| % { Stop-Process -Id $_.OwningProcess -Force }` |
| `Environment variable not found: DATABASE_URL` | Ensure `.env` exists in **both** the repo root and `apps/api/`. Copy from root: `copy .env apps\api\.env` |
| `Cannot find module '@deezed/shared'` | From repo root run: `cd packages\shared && npm run build && cd ..\..` |
| Expo: “Unable to resolve ../../App” | Entry is `apps/mobile/index.js`. Start Expo from repo root with `npm run dev:mobile` (so it uses the workspace). |
| Expo: “react-native-worklets/plugin” | From repo root: `npm install react-native-worklets --legacy-peer-deps` |
| App on phone can’t reach API | Set `EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3001` in `.env` (and in `apps/api/.env`), then restart Expo. |

---

## Summary checklist

- [ ] Docker running (`docker compose up -d`)
- [ ] `.env` in root and in `apps/api/` with Clerk + OpenAI keys
- [ ] `npm install --legacy-peer-deps` and `packages/shared` built
- [ ] Prisma migrated and seeded (`npm run db:seed`)
- [ ] Terminal 1: `npm run dev:api` → “running at http://0.0.0.0:3001”
- [ ] Terminal 2: `npm run dev:mobile` → QR code
- [ ] Phone on same Wi‑Fi; `EXPO_PUBLIC_API_URL` set to your PC IP if using device
