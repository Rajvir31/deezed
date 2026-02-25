# DEEZED — AI-Powered Workout Intelligence

## Demo Video

Short walkthrough of the Deezed flow: workout generation, AI transformation preview, and user experience.

[![Watch the Deezed demo](https://img.youtube.com/vi/VGLbBL2Tz_Y/0.jpg)](https://youtube.com/shorts/VGLbBL2Tz_Y)

A production-grade, full-stack AI workout app built as a monorepo with a React Native (Expo) mobile client and a Fastify + Prisma + Postgres API backend.

---

## 1. Architecture Overview

### Tech Decisions

| Layer | Technology | Why |
|-------|-----------|-----|
| **Mobile** | Expo (React Native) + TypeScript | Cross-platform (iOS/Android), Expo Router for file-based navigation |
| **UI Styling** | NativeWind (Tailwind CSS for RN) | Familiar Tailwind API, utility-first, fast styling |
| **Client State** | Zustand | Lightweight, no boilerplate, great TypeScript support |
| **Server State** | TanStack Query (React Query) | Caching, background refetching, mutation handling |
| **Backend** | Fastify | Purpose-built API server—faster than Express, built-in schema validation, plugin architecture. No SSR needed for mobile-only API |
| **ORM** | Prisma | Mature migrations, excellent generated TypeScript types, great DX |
| **Database** | PostgreSQL 16 | Battle-tested relational DB, JSON columns for flexible plan storage |
| **Auth** | Clerk | Excellent React Native SDK, handles auth flows, session management |
| **Storage** | S3-compatible (MinIO locally) | Signed URLs for secure photo upload/download, encrypted at rest |
| **AI** | OpenAI API (GPT-4o) | Structured JSON outputs via Zod validation for plan generation, coaching, physique analysis |
| **Validation** | Zod (shared package) | Runtime + TypeScript type inference, shared between client and server |
| **Testing** | Vitest | Faster than Jest, native ESM, compatible API |

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APP (Expo)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Auth     │ │ Workout  │ │ Physique │ │ AI Coach  │  │
│  │ Screens  │ │ Tracker  │ │ Simulator│ │ Chat      │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       │             │            │              │        │
│  ┌────┴─────────────┴────────────┴──────────────┴─────┐  │
│  │         TanStack Query + Zustand + API Client      │  │
│  └────────────────────────┬───────────────────────────┘  │
└───────────────────────────┼──────────────────────────────┘
                            │ HTTPS / Bearer Token
┌───────────────────────────┼──────────────────────────────┐
│                     FASTIFY API                          │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Auth    │ │ Rate     │ │ Storage  │ │ AI Service │  │
│  │ Plugin  │ │ Limiter  │ │ (S3)     │ │ (OpenAI)   │  │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘  │
│       │           │            │              │         │
│  ┌────┴───────────┴────────────┴──────────────┴──────┐  │
│  │                    Routes                          │  │
│  │  /profile  /plan  /workout  /progress              │  │
│  │  /ai/coach  /physique  /photos                     │  │
│  └────────────────────────┬───────────────────────────┘  │
└───────────────────────────┼──────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────┴─────┐    ┌───────┴───────┐   ┌──────┴──────┐
   │PostgreSQL │    │ MinIO (S3)    │   │  OpenAI API │
   │  (Prisma) │    │ Photo Storage │   │  (GPT-4o)   │
   └───────────┘    └───────────────┘   └─────────────┘
```

### Data Flow for Key Features

**Workout Plan Generation:**
1. User completes onboarding → profile saved to DB
2. `POST /plan/generate` → user context sent to AI service
3. AI returns structured JSON (Zod-validated `AIPlanOutput`)
4. Plan stored in DB as JSON column, AI result audited
5. Client fetches via `GET /plan/current`

**Physique Simulator:**
1. Age gate + consent → `POST /physique/upload-url` (signed URL)
2. Client uploads directly to S3 via signed URL
3. `POST /physique/analyze-and-simulate` triggers:
   - Content moderation check
   - Parallel: AI text analysis + image generation (mock MVP)
   - Combined result validated with `PhysiqueAIOutputSchema`

---

## 2. Monorepo File Tree

```
deezed/
├── apps/
│   ├── api/                          # Fastify backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema
│   │   │   └── seed.ts               # Exercise library seed
│   │   ├── src/
│   │   │   ├── index.ts              # Server entry point
│   │   │   ├── lib/
│   │   │   │   ├── env.ts            # Environment validation
│   │   │   │   └── prisma.ts         # Prisma client
│   │   │   ├── plugins/
│   │   │   │   └── auth.ts           # Clerk auth plugin
│   │   │   ├── routes/
│   │   │   │   ├── profile.ts        # GET/PUT /profile, POST /profile/verify-age
│   │   │   │   ├── plan.ts           # POST /plan/generate, GET /plan/current
│   │   │   │   ├── workout.ts        # POST start/log-set/finish, GET history
│   │   │   │   ├── progress.ts       # GET /progress/summary, POST metric
│   │   │   │   ├── ai-coach.ts       # POST /ai/coach
│   │   │   │   ├── physique.ts       # POST upload-url, POST analyze
│   │   │   │   └── photos.ts         # GET/DELETE /photos
│   │   │   └── services/
│   │   │       ├── ai.ts             # OpenAI wrapper
│   │   │       ├── plan-generator.ts # AI plan generation with prompts
│   │   │       ├── coach.ts          # AI coach with prompts
│   │   │       ├── physique-simulator.ts  # Physique analysis + IImageGenerator
│   │   │       ├── storage.ts        # S3 signed URLs, upload/delete
│   │   │       └── moderation.ts     # Content moderation + age verify
│   │   ├── tests/
│   │   │   ├── setup.ts
│   │   │   ├── schemas.test.ts       # Zod schema validation tests
│   │   │   ├── moderation.test.ts    # Moderation logic tests
│   │   │   └── plan-generator.test.ts # Split recommendation tests
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   └── mobile/                       # Expo React Native app
│       ├── app/
│       │   ├── _layout.tsx           # Root layout (Clerk + QueryClient)
│       │   ├── index.tsx             # Redirect entry
│       │   ├── (auth)/
│       │   │   ├── _layout.tsx
│       │   │   ├── sign-in.tsx
│       │   │   └── sign-up.tsx
│       │   └── (app)/
│       │       ├── _layout.tsx
│       │       ├── onboarding.tsx    # Multi-step onboarding
│       │       ├── settings.tsx      # Privacy, delete, sign out
│       │       ├── workout/
│       │       │   └── [id].tsx      # Live workout logging
│       │       └── (tabs)/
│       │           ├── _layout.tsx   # Tab navigator
│       │           ├── index.tsx     # Home dashboard
│       │           ├── plan.tsx      # Plan calendar + detail
│       │           ├── progress.tsx  # Charts + metrics
│       │           ├── physique.tsx  # Physique simulator
│       │           └── coach.tsx     # AI coach chat
│       ├── src/
│       │   ├── api/
│       │   │   ├── client.ts         # Fetch wrapper
│       │   │   └── hooks/
│       │   │       ├── useProfile.ts
│       │   │       ├── usePlan.ts
│       │   │       ├── useWorkout.ts
│       │   │       ├── useProgress.ts
│       │   │       ├── usePhysique.ts
│       │   │       └── useCoach.ts
│       │   └── stores/
│       │       ├── auth.ts           # Auth state (Zustand)
│       │       ├── workout.ts        # Active workout state
│       │       └── onboarding.ts     # Onboarding form state
│       ├── app.json
│       ├── babel.config.js
│       ├── metro.config.js
│       ├── tailwind.config.js
│       ├── global.css
│       ├── nativewind-env.d.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                       # Shared types, schemas, constants
│       ├── src/
│       │   ├── index.ts
│       │   ├── constants.ts          # Enums, config, disclaimers
│       │   └── schemas/
│       │       ├── user.ts           # Profile, BodyMetric, ProgressSummary
│       │       ├── workout.ts        # Exercise, Plan, Session, SetLog
│       │       ├── ai.ts             # Coach, AIPlanOutput, AIResult
│       │       └── physique.ts       # Physique schemas + IImageGenerator
│       ├── package.json
│       └── tsconfig.json
│
├── docker-compose.yml                # Postgres + MinIO
├── package.json                      # Workspace root
├── turbo.json
├── tsconfig.base.json
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── .gitignore
└── README.md
```

---

## 3. Step-by-Step Setup

### Prerequisites

- **Node.js** ≥ 20
- **Docker** + Docker Compose
- **Expo CLI** (`npx expo` works, or `npm install -g expo-cli`)
- Accounts: [Clerk](https://clerk.com), [OpenAI](https://platform.openai.com)

### Local Development

```bash
# 1. Clone and enter the repo
cd deezed

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your Clerk and OpenAI keys

# 3. Start infrastructure (Postgres + MinIO)
docker compose up -d

# 4. Install all dependencies
npm install

# 5. Generate Prisma client & run migrations
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
cd ../..

# 6. Seed the exercise library
npm run db:seed

# 7. Start the API server
npm run dev:api
# → API running at http://localhost:3001

# 8. Start the mobile app (in another terminal)
npm run dev:mobile
# → Expo DevTools open, scan QR code with Expo Go
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `CLERK_SECRET_KEY` | Clerk backend secret key | Yes |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Same key, for mobile | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `OPENAI_MODEL` | Model name (default: gpt-4o) | No |
| `S3_ENDPOINT` | MinIO endpoint (default: http://localhost:9000) | Yes |
| `S3_ACCESS_KEY` | MinIO access key | Yes |
| `S3_SECRET_KEY` | MinIO secret key | Yes |
| `S3_BUCKET` | S3 bucket name (default: deezed-photos) | No |
| `API_HOST` | API host (default: 0.0.0.0) | No |
| `API_PORT` | API port (default: 3001) | No |
| `EXPO_PUBLIC_API_URL` | API URL for mobile (default: http://localhost:3001) | Yes |

### Running Tests

```bash
cd apps/api
npm test
```

---

## 4. API Contracts

All endpoints require `Authorization: Bearer <token>` header (Clerk JWT).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/profile` | Get user profile |
| `PUT` | `/profile` | Create or update profile |
| `POST` | `/profile/verify-age` | Age verification (18+) |
| `POST` | `/plan/generate` | Generate AI workout plan |
| `GET` | `/plan/current` | Get active plan |
| `POST` | `/workout/start` | Start a workout session |
| `POST` | `/workout/log-set` | Log a set within a session |
| `POST` | `/workout/finish` | Complete a session |
| `GET` | `/workout/history` | Get past sessions |
| `GET` | `/progress/summary` | Analytics overview |
| `POST` | `/progress/metric` | Log body metric |
| `POST` | `/ai/coach` | Chat with AI coach |
| `POST` | `/physique/upload-url` | Get signed upload URL |
| `POST` | `/physique/analyze-and-simulate` | Run physique analysis |
| `GET` | `/photos` | List user photos |
| `POST` | `/photos/upload-url` | Get signed URL for progress photos |
| `DELETE` | `/photos/:id` | Delete a photo |
| `DELETE` | `/photos` | Delete all user photos |

---

## 5. MVP Physique Simulator Strategy

### Current State (MVP)

The physique simulator uses a **mock image generator** that returns a branded placeholder image with a "Coming Soon" watermark. The AI text analysis (posture notes, plan recommendations, nutrition targets) is **fully functional** via GPT-4o.

### How It Works Now

1. User uploads a photo → stored in S3 with signed URL
2. Content moderation check runs (MVP: metadata validation only)
3. AI analyzes user context and generates a structured plan update
4. Mock image generator returns a placeholder preview
5. Full result (analysis + mock image + disclaimers) returned to client

### IImageGenerator Interface

```typescript
interface IImageGenerator {
  generate(input: IImageGeneratorInput): Promise<IImageGeneratorOutput>;
}
```

The MVP implements `MockImageGenerator`. To upgrade:

### Upgrade to Real Image Generation

1. **Choose a provider**: Replicate (SDXL), Stability AI, or custom model
2. **Implement the interface**:
   ```typescript
   class ReplicateImageGenerator implements IImageGenerator {
     async generate(input) {
       // Call Replicate API with source image + prompt
       // Return generated image URL + metadata
     }
   }
   ```
3. **Update the factory** in `physique-simulator.ts`:
   ```typescript
   export function createImageGenerator(): IImageGenerator {
     return new ReplicateImageGenerator(process.env.REPLICATE_API_TOKEN!);
   }
   ```
4. **Upgrade content moderation** to use real vision API (OpenAI Vision, AWS Rekognition)
5. **No other changes needed** — the rest of the pipeline stays identical

### What Changes When Upgrading

| Component | Change Required |
|-----------|----------------|
| `IImageGenerator` implementation | New class (e.g., `ReplicateImageGenerator`) |
| Factory function | Point to new implementation |
| Environment variables | Add provider API key |
| Content moderation | Integrate real vision API |
| Client UI | Remove "mock preview" overlay text |
| Everything else | **No changes** |

---

## 6. Security, Privacy & Safety

- **Age Gate**: Users must verify 18+ before accessing physique feature
- **Consent Screen**: Explains photo use, storage, retention, and deletion before any upload
- **Encrypted Storage**: S3/MinIO with AES-256 server-side encryption
- **Signed URLs**: Short-lived (5 min) presigned URLs for all photo access
- **User Deletion**: Delete individual photos or all photos from Settings
- **No Training**: UI explicitly states photos are not used for AI training
- **Content Moderation**: Placeholder for real moderation API integration
- **Rate Limiting**: AI endpoints limited (default: 20 requests/minute)
- **Disclaimers**: Every physique result includes fitness disclaimers

---

## 7. Acceptance Checklist

- [x] **Monorepo structure** with workspace packages
- [x] **TypeScript everywhere** with strict mode
- [x] **Auth flow** — Clerk sign in/up with JWT token management
- [x] **Onboarding** — Multi-step flow (name, experience, goal, schedule, equipment, injuries)
- [x] **Split recommendations** based on days/week
- [x] **AI plan generation** — 4-week periodized plan with progressive overload
- [x] **Workout tracking** — Start session, log sets (weight/reps/RPE), timer, finish
- [x] **Progress analytics** — Total volume, streak, PRs, volume by muscle group
- [x] **Body metrics** — Log weight/body fat with history
- [x] **AI Coach** — Chat UI with rationale display and structured action suggestions
- [x] **Physique Simulator** — Age gate, consent, upload, scenario selection, analysis
- [x] **Photo management** — Signed URL upload/download, individual/bulk delete
- [x] **IImageGenerator interface** — Clean upgrade path for real image generation
- [x] **Content moderation** — Placeholder with clear upgrade path
- [x] **Privacy/Safety** — Disclaimers, consent, no-training notice, deletion flows
- [x] **Rate limiting** on AI endpoints
- [x] **Database schema** — All models with relations and cascading deletes
- [x] **Exercise seed data** — 36 exercises across all muscle groups
- [x] **Zod validation** — Shared schemas for all API contracts
- [x] **Tests** — Schema validation, moderation logic, split recommendation tests
- [x] **Dark theme UI** — Consistent brand colors, polished mobile screens
- [x] **Docker Compose** — Postgres + MinIO for local development
- [x] **Environment validation** — Zod-validated env vars with helpful errors

### MVP Stubs (Clearly Marked)

| Feature | Status | Upgrade Notes |
|---------|--------|---------------|
| Image generation | Mock placeholder | Implement `IImageGenerator` with real provider |
| Content moderation | Metadata-only check | Integrate OpenAI Vision or AWS Rekognition |
| Notifications | UI placeholder in settings | Add Expo Notifications + push infrastructure |
| Data export | UI placeholder in settings | Add CSV/JSON export endpoint |
| Account deletion | Contact support flow | Add `DELETE /account` endpoint |
| Progress photos gallery | Upload works | Add image gallery component with zoom |
