"use client";

import Link from "next/link";
import { useFullSatStatus } from "@/hooks/use-full-sat";
import { FileText, Lock, ArrowRight, Trophy } from "lucide-react";
import { MOCK_EXAM_LABEL } from "@/lib/exam-config";

function formatDaysUntil(dateString: string): string {
  const diff = new Date(dateString).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "now";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function formatMockScore(totalScore: number): string {
  // Legacy SAT attempts store 400–1600; show percentage-style when in MBE range.
  if (totalScore <= 100) return `${totalScore}%`;
  return `${totalScore}/1600`;
}

export function FullSatCard() {
  const { data: status, isLoading } = useFullSatStatus();

  if (isLoading || !status) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        <div className="mt-3 h-4 w-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (status.currentAttempt) {
    return (
      <Link
        href={`/full-sat/${status.currentAttempt.id}`}
        className="block rounded-xl border-2 border-primary/50 bg-card p-5 transition-colors hover:bg-primary/5"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <FileText className="h-5|
| `GET /api/health` | Health check |
| `GET /api/health/db` | Database connectivity check |
| `GET /api/health/agents` | Agent service health check |
| `GET /api/health/all` | Combined health check |

---

## 4. Authentication

### 4.1 Clerk Integration

Authentication is handled by **Clerk**. The frontend uses Clerk React components; the backend validates sessions via `@clerk/nextjs/server`.

**Protected routes** (require sign-in):
- `/dashboard`, `/learning`, `/mentor`, `/profile`, `/analytics`, `/full-sat`, `/personalized`, `/studio`, `/onboarding`, `/checkout`, `/billing`

**Public routes:**
- `/`, `/sign-in`, `/sign-up`, `/pricing`, `/api/webhooks/*`, `/api/health/*`

### 4.2 User Sync

On first authenticated request, the app syncs the Clerk user to Supabase `users` table via `ensureUserSynced()`. Fields synced: `clerk_id`, `email`, `name`, `avatar_url`, `role`.

### 4.3 Admin Access

Platform admins are determined by:
1. `ATHENA_ADMIN_EMAILS` env var (comma-separated emails) — bootstrap on first login
2. `users.role = 'admin'` in database (source of truth after bootstrap)

Admin routes: `/studio/admin/*`, `/api/admin/*`

### 4.4 Learning Access (Paywall)

When `LEARNER_PAYWALL=1`:
- Users need `learning_access = true` OR active trial (`trial_ends_at > now`)
- Stripe webhook sets `learning_access = true` on successful subscription
- Grandfathered users (no trial end date) retain access

---

## 5. Database Schema

### 5.1 Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles, subscription, trial, learning access |
| `topics` | Top-level curriculum (e.g., Civil Procedure, Torts) |
| `subtopics` | Sub-units within topics |
| `problems` | MCQ questions (question_text, options, correct_option, explanation) |
| `problem_attempts` | User answers to problems |
| `quiz_sessions` | Quiz session metadata |
| `quiz_session_problems` | Problems in a quiz session |
| `micro_lessons` | Generated lesson content |
| `micro_lesson_steps` | Steps within a micro-lesson |
| `full_sat_tests` | Full-length mock exam definitions |
| `full_sat_attempts` | User attempts on full mock exams |
| `full_sat_answers` | Answers per question in an attempt |
| `full_sat_test_problems` | Problems assigned to a mock test |
| `daily_quests` | Daily quest definitions |
| `daily_quest_completions` | User daily quest completions |
| `lesson_plans` | Uploaded lesson plans for personalized practice |
| `lesson_plan_classifications` | AI classification of lesson plans to subtopics |
| `user_subtopic_progress` | Progress per subtopic |
| `user_topic_progress` | Progress per topic |
| `onboarding_sessions` | Onboarding diagnostic state |
| `onboarding_answers` | Diagnostic answers |
| `billing_events` | Stripe webhook events |
| `mentor_sessions` | Voice mentor session metadata |
| `mentor_messages` | Mentor chat messages |
| `flashcards` | User flashcards |
| `podcasts` | Generated podcasts |
| `reports` | Quiz/lesson reports |
| `accountability_status` | Daily quest lock state |

### 5.2 Key Enums

- `problem_source`: `onboarding`, `sat`, `practice`, `custom`, `full_sat`
- `session_source`: `onboarding`, `sat`, `custom`, `full_sat`
- `users.role`: `user`, `admin`

### 5.3 MBE Subject Slugs

Stored in `topics.subject`:

- `civil-procedure`
- `constitutional-law`
- `contracts`
- `criminal-law`
- `evidence`
- `real-property`
- `torts`

---

## 6. API Routes Reference

### 6.1 User & Auth

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/user/me` | Current user profile, admin status, learning access |
| POST | `/api/user/sync` | Sync Clerk user to Supabase |

### 6.2 Learning & Curriculum

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/learning` | All topics with subtopics for learning page |
| GET | `/api/learning/[topicSlug]/[subtopicSlug]` | Subtopic details + problems |
| GET | `/api/dashboard` | Dashboard data (topics, daily quest, progress) |

### 6.3 Agent (AI)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/agent/micro-lesson/stream` | Stream micro-lesson generation |
| POST | `/api/agent/practice-problems/stream` | Stream practice problem generation |
| POST | `/api/agent/sat-quiz/stream` | Stream SAT quiz tutor (legacy name) |
| POST | `/api/agent/lesson-plan/classify` | Classify lesson plan to subtopics |
| POST | `/api/agent/mentor/stream` | Voice mentor streaming |
| POST | `/api/agent/infographic` | Generate infographic |
| POST | `/api/agent/podcast` | Generate podcast |
| POST | `/api/agent/flashcards` | Generate flashcards |

### 6.4 Quizzes & Practice

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/sat-quiz/start` | Start subtopic quiz |
| POST | `/api/sat-quiz/submit` | Submit quiz answer |
| POST | `/api/lesson-plan/practice-problems` | Get practice problems for lesson plan |
| POST | `/api/daily-quest/start` | Start daily quest |
| POST | `/api/daily-quest/answer` | Submit daily quest answer |
| POST | `/api/daily-quest/complete` | Complete daily quest |

### 6.5 Full Mock Exam (MBE)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/mbe-mock` | Mock exam status (available, in-progress, cooldown) |
| POST | `/api/mbe-mock/start` | Start mock exam attempt |
| POST | `/api/mbe-mock/answer` | Submit answer |
| POST | `/api/mbe-mock/submit` | Submit completed section/exam |
| GET | `/api/mbe-mock/history` | Past attempts |

### 6.6 Onboarding

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/onboarding/status` | Onboarding completion status |
| POST | `/api/onboarding/diagnostic/start` | Start diagnostic |
| POST | `/api/onboarding/diagnostic/submit` | Submit diagnostic answers |
| POST | `/api/onboarding/baseline` | Submit self-reported baseline |

### 6.7 Billing

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/billing/checkout` | Create Stripe checkout session |
| GET | `/api/billing/portal` | Stripe customer portal URL |
| POST | `/api/webhooks/stripe` | Stripe webhook handler |

### 6.8 Admin

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/curriculum` | List curriculum (topics/subtopics) |
| POST | `/api/admin/curriculum/topics` | Create topic |
| PUT | `/api/admin/curriculum/topics/[id]` | Update topic |
| DELETE | `/api/admin/curriculum/topics/[id]` | Delete topic |
| POST | `/api/admin/curriculum/subtopics` | Create subtopic |
| PUT | `/api/admin/curriculum/subtopics/[id]` | Update subtopic |
| DELETE | `/api/admin/curriculum/subtopics/[id]` | Delete subtopic |
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/users/[userId]` | User detail |
| PATCH | `/api/admin/users/[userId]` | Update user (trial, access) |

### 6.9 Other

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/analytics` | User analytics dashboard data |
| GET | `/api/accountability/status` | Daily quest lock status |
| POST | `/api/mentor/transcribe` | ElevenLabs STT for mentor |
| POST | `/api/mentor/tts` | ElevenLabs TTS for mentor |

---

## 7. Frontend Routes

| Route | Page | Auth |
|-------|------|------|
| `/` | Marketing landing | Public |
| `/sign-in`, `/sign-up` | Clerk auth | Public |
| `/pricing` | Pricing | Public |
| `/checkout` | Stripe checkout redirect | Protected |
| `/onboarding` | Onboarding wizard | Protected |
| `/dashboard` | Main dashboard (topics, daily quest) | Protected |
| `/learning` | Learning library | Protected |
| `/learning/[topicSlug]/[subtopicSlug]` | Subtopic hub | Protected |
| `/learning/.../micro-lesson` | Micro-lesson | Protected |
| `/learning/.../quiz` | Subtopic quiz | Protected |
| `/mbe-mock` | MBE mock exam landing | Protected |
| `/mbe-mock/[attemptId]` | Mock exam in progress | Protected |
| `/mbe-mock/[attemptId]/results` | Mock exam results | Protected |

Legacy `/full-sat` URLs redirect to `/mbe-mock` (see `next.config.ts`).
| `/mentor` | Voice mentor | Protected |
| `/personalized` | Lesson plan → practice | Protected |
| `/profile` | User profile | Protected |
| `/analytics` | Analytics dashboard | Protected |
| `/studio/admin/curriculum` | Admin curriculum CRUD | Admin |
| `/studio/admin/users` | Admin user management | Admin |

---

## 8. Python Agent Service

### 8.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/micro-lesson/stream` | Stream micro-lesson (SSE) |
| POST | `/practice-problems/stream` | Stream practice problems |
| POST | `/sat-quiz/stream` | Quiz tutor stream |
| POST | `/lesson-plan/classify` | Classify lesson plan |
| POST | `/mentor/stream` | Mentor chat stream |
| POST | `/infographic` | Generate infographic |
| POST | `/podcast` | Generate podcast |
| POST | `/flashcards` | Generate flashcards |

### 8.2 Agent Modules

- `app/run_time/sat/micro_lesson_agent.py` — Micro-lesson generation (MBE law prompts)
- `app/run_time/sat/whiteboard_agent.py` — Whiteboard step rendering
- `app/run_time/sat/infographic_agent.py` — Infographic generation
- Uses Anthropic Claude for LLM; OpenAI for images when configured

### 8.3 Micro-Lesson Subject Routing

- **MBE subjects** (`civil-procedure`, `constitutional-law`, etc.) → `_LAW_LESSON_INSTRUCTIONS`
- **Legacy** `reading-writing` → `_RW_LESSON_INSTRUCTIONS`
- **Legacy** `math` → Math-specific instructions
- **Other** → `_GENERAL_LESSON_INSTRUCTIONS`

---

## 9. Environment Variables

### 9.1 Required

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-only) |
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Anthropic API for AI agents |
| `NEXT_PUBLIC_APP_URL` | App URL (e.g., `http://localhost:3000`) |
| `APP_URL` | Same as above (server) |

### 9.2 Stripe (Billing)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_PRICE_MONTHLY` | Monthly price ID |
| `STRIPE_PRICE_ANNUAL` | Annual price ID |

### 9.3 Optional

| Variable | Description |
|----------|-------------|
| `ATHENA_ADMIN_EMAILS` | Comma-separated admin emails |
| `LEARNER_PAYWALL` | `1` to enforce subscription/trial |
| `QUEST_ACCOUNTABILITY` | `1` to lock learning until daily quest done |
| `AGENT_SERVICE_URL` | Python agent URL (default `http://localhost:8765`) |
| `ELEVENLABS_API_KEY` | Voice mentor STT/TTS |
| `ELEVENLABS_VOICE_ID` | TTS voice ID |
| `USE_AGENT_CLASSIFIER` | Use Python for lesson plan classification |
| `NEXT_PUBLIC_CLARITY_ID` | Microsoft Clarity analytics |
| `NEXT_PUBLIC_UMAMI_SRC` | Umami analytics |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Umami website ID |

### 9.4 Clerk URLs

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/checkout?interval=monthly` |

---

## 10. Setup & Deployment

### 10.1 Local Development

```bash
# Install dependencies
pnpm install
cd agents && pip install -r requirements.txt && cd ..

# Configure .env (see Section 9)

# Seed MBE curriculum
npm run seed:mbe-taxonomy

# Run Next.js + agents
npm run dev          # Next.js on :3000
npm run agents:dev   # Python agents on :8765
```

Or use Makefile:

```bash
make setup-all
make dev-all
```

### 10.2 Production Build

```bash
pnpm build
pnpm start
```

Agents must run separately (e.g., separate process, container, or serverless).

### 10.3 Database Migrations

Schema is managed via Supabase. Apply migrations from `supabase/migrations/` or use Supabase Dashboard. Content tables script: `npm run db:content-tables`.

### 10.4 Stripe Webhook

Configure Stripe webhook to `https://your-domain.com/api/webhooks/stripe` for:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

## 11. MBE Conversion Notes

### 11.1 Completed (MVP)

- Branding: SAT → UBE/MBE
- Dashboard subjects: 7 MBE subjects
- Admin curriculum: MBE subjects
- `scripts/seed-mbe-taxonomy.ts` for curriculum seed
- AI agent: `_LAW_LESSON_INSTRUCTIONS` for MBE subjects
- Mock exam UI labels (internal route still `/full-sat`)

### 11.2 Pending / Phase 2

- MEE essay module
- Full mock exam scoring → percentage/pass mark
- Onboarding diagnostic → MBE baseline
- Problem content: seed MBE MCQs (source: `practice`)
- Remove/archive legacy SAT topics in DB

### 11.3 Legacy SAT Artifacts

- Routes: `/full-sat`, `/api/full-sat/*` (unchanged internally)
- DB tables: `full_sat_*` (unchanged)
- Problem source `sat` still supported for backward compatibility
- Scoring: `src/lib/full-sat/scoring.ts` still uses SAT curves for mock results

---

## 12. Troubleshooting

| Issue | Check |
|-------|-------|
| Agent not responding | `AGENT_SERVICE_URL`, `npm run agents:dev`, port 8765 |
| No topics on dashboard | Run `npm run seed:mbe-taxonomy`, verify Supabase connection |
| Auth redirect loop | Clerk URLs in `.env`, middleware config |
| Stripe webhook fails | `STRIPE_WEBHOOK_SECRET`, ngrok for local testing |
| Learning locked | `LEARNER_PAYWALL`, `learning_access`, trial dates |
| Daily quest lock | `QUEST_ACCOUNTABILITY=1`, complete today's quest |

---

## 13. Key File Locations

| Purpose | Path |
|---------|------|
| Exam config (MBE subjects, branding) | `src/lib/exam-config.ts` |
| MBE curriculum seed | `scripts/seed-mbe-taxonomy.ts` |
| Micro-lesson agent | `agents/app/run_time/sat/micro_lesson_agent.py` |
| Lesson plan classifier | `src/lib/lesson-plan/classify.ts` |
| Admin curriculum | `src/lib/db/queries/admin-curriculum.ts` |
| Mock exam logic | `src/lib/db/queries/full-sat.ts` |
| Stripe plans | `src/lib/stripe/plans.ts` |

---

**Document Version:** 1.0  
**Last Updated:** July 2, 2026  
**Maintained for:** Athena UBE/MBE Bar Exam Prep Platform
