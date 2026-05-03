# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Database Schema

Tables in PostgreSQL (managed via Drizzle ORM):

- **users** — Firebase UID, name, email
- **children** — `id`, `userId` (Firebase UID), `name`, `age`, `interests` (JSON text), `defaultStoryLength`, `tone`, `createdAt`, `updatedAt`
- **savedStories** — `id`, `userId`, `childId` (nullable FK to children.id), `seriesId`, `episodeNumber`, `childName`, `emoji`, `title`, `story`, `storySummary` (3–5 sentence AI summary), `interests`, `createdAt`
- **series** — `id`, `userId`, `childId`, `title`, `theme`, `createdAt`, `updatedAt`
- **story_memory** — `id`, `userId`, `childId` (required), `seriesId` (nullable — series-specific vs child-wide), `mainCharacters` (JSON), `sideCharacters` (JSON), `locations` (JSON), `themes` (JSON text array), `tonePreferences` (JSON text array), `updatedAt`
- **streaks** — `id`, `userId`, `clientId`, `lastActivityDate`, `streakCount`, `updatedAt`
- **preferences** — per-user fallback preferences (userId, childName, age, interests, storyLength)
- **voiceProfiles** — clientId → ElevenLabs voiceId/voiceName

### Children Profile API

- `GET /api/children` — list all child profiles for the authenticated user (requireAuth)
- `POST /api/children` — create a new child profile
- `PUT /api/children/:id` — update a child profile (owner only)
- `DELETE /api/children/:id` — delete a child profile (owner only)

Child profile fields: `name`, `age`, `interests[]`, `defaultStoryLength` (5min/10min/15min), `tone` (calm/exciting/silly/adventurous/magical)

### Frontend Child Profile UX

- `useChildren` hook (`artifacts/story-app/src/hooks/useChildren.ts`) — CRUD for child profiles via fetch + Firebase auth token
- `ChildProfileBar` component (`artifacts/story-app/src/components/ChildProfileBar.tsx`) — chip row shown when logged in; click to select/prefill form; pencil to edit; trash to delete; + to add new (dialog with name, age, interests, length, tone)
- Selecting a child pre-fills the story form with their saved preferences
- Stories are saved with `childId` linking them to the selected child profile
- Story generation passes the child's preferred `tone` to the AI prompt

## App: Dreamtime Stories (`artifacts/story-app`)

Children's bedtime story generator with:
- OpenAI story generation (`gpt-4o-mini`) with child-safe system prompt
- Read Aloud TTS via `POST /api/tts` (OpenAI `nova` voice, MP3 streaming)
- Daily streak tracking via `streaks` table + localStorage client UUID
- Save / delete stories (PostgreSQL via Drizzle)
- Print Story — `@media print` CSS reveals a clean A4 print layout
- **Illustrated PDF export** — `POST /api/generate-illustrations` generates 3 watercolour scenes via `gpt-image-1`, then `jsPDF` builds a multi-page storybook PDF client-side (cover + story pages, cream background, Times serif, soft accent lines)

### PDF Export Flow
1. Backend (`artifacts/api-server/src/routes/illustrations.ts`): splits story into beginning/middle/end paragraphs → GPT generates 3 vivid image prompts → `gpt-image-1` generates images in parallel → returns base64 PNG strings
2. Frontend (`artifacts/story-app/src/hooks/usePdfExport.ts`): converts PNG→JPEG via canvas → `jsPDF` builds A4 PDF → auto-downloads

### Voice Cloning ("Play in My Voice")
- Users upload a 30–60 s audio sample (MP3/WAV/M4A/OGG/WebM)
- Backend (`artifacts/api-server/src/routes/voice.ts`) calls ElevenLabs API to clone the voice and stores the resulting `voiceId` in the `voiceProfiles` table keyed by anonymous `clientId`
- `POST /api/voice/upload` — multipart upload (multer), clones voice via ElevenLabs, persists profile
- `GET /api/voice/:clientId` — returns `{ voiceId, voiceName }` or 404
- `DELETE /api/voice/:clientId` — deletes voice from ElevenLabs + DB
- `POST /api/voice-tts` — streams ElevenLabs TTS audio (`eleven_multilingual_v2`) using the cloned voice
- Requires `ELEVENLABS_API_KEY` secret (stored in Replit Secrets — **not** using the Replit ElevenLabs integration connector, which was dismissed by the user)
- Frontend: `useVoiceProfile` hook + `VoiceUploadSection` component (consent UI, drag-and-drop) + `MyVoicePlayer` (shown below the standard Read Aloud player when a voice is active)

### Story Memory System

After each story is generated or continued, AI automatically extracts and persists characters, locations, and themes into `story_memory`. On the next story/continuation, this memory is injected into the prompt so narratives stay consistent across episodes.

**Memory scope**: one record per `(userId, childId, seriesId)` tuple. `seriesId = null` = child-wide default memory.

**Backend files**:
- `artifacts/api-server/src/routes/memory.ts` — CRUD routes + `extractMemoryFromStory()` (AI extraction), `upsertMemoryAfterStory()` (called fire-and-forget after generation), `loadMemoryForPrompt()` (injects into prompt)
- `artifacts/api-server/src/routes/story.ts` — calls `loadMemoryForPrompt` before generating and `upsertMemoryAfterStory` after; returns `summary` field on every story response
- `lib/db/src/schema/storyMemory.ts` — Drizzle table definition for `story_memory`

**API routes** (all `requireAuth`):
- `GET /api/memory?childId=&seriesId=` — get memory records for a child/series
- `PUT /api/memory` — upsert memory (manual override)
- `DELETE /api/memory?childId=&seriesId=` — clear memory

**Frontend**:
- `artifacts/story-app/src/hooks/useMemory.ts` — React hook for fetching/updating/clearing memory (uses Firebase token)
- `artifacts/story-app/src/components/StoryMemoryPanel.tsx` — collapsible panel shown in the story form (after SeriesPicker) that displays characters, side characters, locations, themes, tone preferences with tooltips and clear/refresh actions

**Story summary**: every story response now includes a `summary` field (3–5 sentences, AI-generated). Saved to `saved_stories.story_summary` and used instead of truncated story text for `continue-story` context.

### Key model names
- Story text: `gpt-4o-mini`
- TTS audio: `gpt-audio` + `nova` voice
- Images: `gpt-image-1` at 1024×1024
- Voice cloning + TTS: ElevenLabs `eleven_multilingual_v2`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
