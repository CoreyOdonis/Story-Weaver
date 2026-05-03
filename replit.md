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
