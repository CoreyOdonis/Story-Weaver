import { Router } from "express";
import multer from "multer";
import { db, voiceProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/mp4",
      "audio/x-m4a",
      "audio/ogg",
      "audio/webm",
      "audio/aac",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported audio format. Please upload an MP3, WAV, M4A, or OGG file."));
    }
  },
});

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured.");
  return key;
}

// ── Upload voice sample → clone → store voice ID ──────────────────────────
router.post("/voice/upload", upload.single("audio"), async (req, res) => {
  const { clientId, voiceName = "My Voice" } = req.body as {
    clientId?: string;
    voiceName?: string;
  };
  const file = req.file;

  if (!clientId || typeof clientId !== "string") {
    res.status(400).json({ error: "Missing clientId." });
    return;
  }
  if (!file) {
    res.status(400).json({ error: "Missing audio file." });
    return;
  }

  try {
    const apiKey = getApiKey();

    const form = new FormData();
    form.append("name", voiceName);
    form.append(
      "files",
      new Blob([file.buffer], { type: file.mimetype }),
      file.originalname || "voice-sample.mp3"
    );
    form.append("description", "Uploaded via Dreamtime Stories");

    const elRes = await fetch(`${ELEVENLABS_BASE}/voices/add`, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });

    if (!elRes.ok) {
      const text = await elRes.text().catch(() => "Unknown error");
      req.log.error({ status: elRes.status, text }, "ElevenLabs voice add failed");
      res.status(502).json({ error: "Voice cloning failed — please try again." });
      return;
    }

    const { voice_id } = (await elRes.json()) as { voice_id: string };

    const [profile] = await db
      .insert(voiceProfilesTable)
      .values({ clientId, elevenLabsVoiceId: voice_id, voiceName })
      .onConflictDoUpdate({
        target: voiceProfilesTable.clientId,
        set: { elevenLabsVoiceId: voice_id, voiceName },
      })
      .returning();

    res.json({ voiceId: profile.elevenLabsVoiceId, voiceName: profile.voiceName });
  } catch (err) {
    req.log.error({ err }, "Voice upload failed");
    res.status(502).json({ error: "Could not create voice — please try again." });
  }
});

// ── Get voice profile ─────────────────────────────────────────────────────
router.get("/voice/:clientId", async (req, res) => {
  const { clientId } = req.params;

  const [profile] = await db
    .select()
    .from(voiceProfilesTable)
    .where(eq(voiceProfilesTable.clientId, clientId));

  if (!profile) {
    res.status(404).json({ error: "No voice profile found." });
    return;
  }

  res.json({ voiceId: profile.elevenLabsVoiceId, voiceName: profile.voiceName });
});

// ── Delete voice profile ──────────────────────────────────────────────────
router.delete("/voice/:clientId", async (req, res) => {
  const { clientId } = req.params;

  const [profile] = await db
    .select()
    .from(voiceProfilesTable)
    .where(eq(voiceProfilesTable.clientId, clientId));

  if (!profile) {
    res.status(404).json({ error: "No voice profile found." });
    return;
  }

  try {
    const apiKey = getApiKey();

    const delRes = await fetch(`${ELEVENLABS_BASE}/voices/${profile.elevenLabsVoiceId}`, {
      method: "DELETE",
      headers: { "xi-api-key": apiKey },
    });

    if (!delRes.ok) {
      req.log.warn(
        { status: delRes.status, voiceId: profile.elevenLabsVoiceId },
        "ElevenLabs voice deletion returned non-OK — removing from DB anyway"
      );
    }

    await db.delete(voiceProfilesTable).where(eq(voiceProfilesTable.clientId, clientId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Voice deletion failed");
    res.status(502).json({ error: "Could not delete voice — please try again." });
  }
});

// ── TTS with cloned voice ─────────────────────────────────────────────────
router.post("/voice-tts", async (req, res) => {
  const { text, voiceId } = req.body as { text?: string; voiceId?: string };

  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Missing text." });
    return;
  }
  if (!voiceId || typeof voiceId !== "string") {
    res.status(400).json({ error: "Missing voiceId." });
    return;
  }
  if (text.length > 8000) {
    res.status(400).json({ error: "Text too long (max 8000 characters)." });
    return;
  }

  try {
    const apiKey = getApiKey();

    const elRes = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.80,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
    });

    if (!elRes.ok) {
      const text = await elRes.text().catch(() => "Unknown error");
      req.log.error({ status: elRes.status, text }, "ElevenLabs TTS failed");
      res.status(502).json({ error: "Could not generate audio — please try again." });
      return;
    }

    const audioBuffer = await elRes.arrayBuffer();

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.byteLength),
      "Cache-Control": "no-store",
    });
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    req.log.error({ err }, "Custom voice TTS failed");
    res.status(502).json({ error: "Could not generate audio — please try again." });
  }
});

export default router;
