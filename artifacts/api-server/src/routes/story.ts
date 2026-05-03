import { Router } from "express";
import { PostGenerateStoryBody } from "@workspace/api-zod";
import { db, savedStoriesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { upsertMemoryAfterStory, loadMemoryForPrompt, type ExtractedMemory } from "./memory";
import { optionalAuth } from "../middleware/optionalAuth";
import type { AuthRequest as OptionalAuthRequest } from "../middleware/requireAuth";

const router = Router();

const interestEmojis: Record<string, string> = {
  dinosaurs: "🦕",
  space: "🚀",
  princess: "👑",
  animals: "🐨",
  cars: "🏎️",
  magic: "✨",
};

const toneDescriptions: Record<string, string> = {
  calm: "calm and soothing",
  exciting: "exciting and energetic",
  silly: "silly and playful",
  adventurous: "adventurous and daring",
  magical: "magical and whimsical",
};

function pickEmoji(interests: string[]): string {
  const first = interests[0];
  return first ? (interestEmojis[first] ?? "⭐") : "⭐";
}

const LENGTH_MAP: Record<"5min" | "10min" | "15min", string> = {
  "5min": "500–700",
  "10min": "900–1200",
  "15min": "1300–1800",
};

function truncate(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max).trim()}…` : cleaned;
}

function memoryContextLines(memory: ExtractedMemory): string[] {
  const lines: string[] = [];
  if (memory.mainCharacters.length > 0) {
    const chars = memory.mainCharacters.map((c) => `${c.name}${c.description ? ` (${c.description})` : ""}`).join(", ");
    lines.push(`Main characters: ${chars}.`);
  }
  if (memory.sideCharacters.length > 0) {
    const chars = memory.sideCharacters.map((c) => c.name).join(", ");
    lines.push(`Side characters: ${chars}.`);
  }
  if (memory.locations.length > 0) {
    const locs = memory.locations.map((l) => `${l.name}${l.description ? ` (${l.description})` : ""}`).join(", ");
    lines.push(`Settings: ${locs}.`);
  }
  if (memory.themes.length > 0) {
    lines.push(`Recurring themes: ${memory.themes.join(", ")}.`);
  }
  if (memory.tonePreferences.length > 0) {
    lines.push(`Tone preferences: ${memory.tonePreferences.join(", ")}.`);
  }
  return lines;
}

async function generateStoryJson(systemPrompt: string, userPrompt: string, interests: string[]) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  let parsed: { title?: string; story?: string; emoji?: string };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch?.[0] ?? raw) as typeof parsed;
  } catch {
    return { error: "Story generation failed — please try again." } as const;
  }

  if (!parsed.title || !parsed.story || !parsed.emoji) {
    return { error: "Story generation failed — please try again." } as const;
  }

  return {
    title: parsed.title,
    story: parsed.story,
    emoji: parsed.emoji || pickEmoji(interests),
  } as const;
}

async function generateStorySummary(title: string, story: string, childName: string, interests: string[]): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 512,
    messages: [
      {
        role: "system",
        content: [
          "Write a short 3-5 sentence summary of the bedtime story.",
          "Capture the key characters, setting, and important events.",
          "Keep it concise for use as context in the next episode.",
          'Respond ONLY with valid JSON: {"summary": "..."}',
        ].join(" "),
      },
      {
        role: "user",
        content: `Title: ${title}\nChild: ${childName}\nInterests: ${interests.join(", ")}\nStory: ${truncate(story, 1200)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return truncate(story, 400);
  try {
    const parsed = JSON.parse(match[0]) as { summary?: string };
    return parsed.summary?.trim() ?? truncate(story, 400);
  } catch {
    return truncate(story, 400);
  }
}

router.post("/generate-story", optionalAuth, async (req: OptionalAuthRequest, res) => {
  const parseResult = PostGenerateStoryBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.message });
    return;
  }

  const { childName, age, interests, storyLength = "5min", tone } = parseResult.data;
  const body = req.body as { childId?: number; seriesId?: number };
  const childId = body.childId ?? null;
  const seriesId = body.seriesId ?? null;
  const userId = req.firebaseUid ?? null;

  const interestsList = interests.join(", ");
  const wordCount = LENGTH_MAP[storyLength] ?? LENGTH_MAP["5min"];
  const toneDesc = tone ? toneDescriptions[tone] : "gentle and soothing";

  let memory: ExtractedMemory | null = null;
  if (userId && childId) {
    memory = await loadMemoryForPrompt({ userId, childId, seriesId });
  }

  const memLines = memory ? memoryContextLines(memory) : [];
  const memSection = memLines.length > 0 ? `Story world context — ${memLines.join(" ")}` : "";

  const systemPrompt = [
    `Write a ${toneDesc} bedtime story for a ${age}-year-old child named ${childName}.`,
    `Include their interests: ${interestsList}.`,
    memSection,
    `The story should be approximately ${wordCount} words long.`,
    "Keep it imaginative and suitable for bedtime.",
    "Include a clear beginning, middle, and end.",
    "End with a soothing, sleep-friendly conclusion.",
    'Respond ONLY with a valid JSON object: {"title": "...", "story": "...", "emoji": "..."}',
    "Do not include any text outside the JSON.",
  ].filter(Boolean).join(" ");

  try {
    const result = await generateStoryJson(
      systemPrompt,
      `Generate a ${toneDesc} bedtime story for ${childName}, age ${age}, who loves: ${interestsList}. Length: ~${wordCount} words.`,
      interests
    );
    if ("error" in result) {
      res.status(500).json({ error: result.error });
      return;
    }

    const [summary] = await Promise.all([
      generateStorySummary(result.title, result.story, childName, interests),
      userId && childId
        ? upsertMemoryAfterStory({ userId, childId, seriesId, title: result.title, story: result.story })
        : Promise.resolve(),
    ]);

    res.json({ ...result, summary });
  } catch (err) {
    req.log.error({ err }, "OpenAI API error");
    res.status(502).json({ error: "Could not reach the story magic right now — please try again!" });
  }
});

router.post("/continue-story", optionalAuth, async (req: OptionalAuthRequest, res) => {
  const body = req.body as {
    childName?: string;
    age?: number;
    interests?: string[];
    storyLength?: "5min" | "10min" | "15min";
    tone?: string;
    seriesId?: number;
    childId?: number;
  };

  if (!body.childName || !body.age || !Array.isArray(body.interests) || body.interests.length === 0 || !body.seriesId) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  const userId = req.firebaseUid ?? null;
  const childId = body.childId ?? null;

  try {
    const [lastStory, memory] = await Promise.all([
      db
        .select()
        .from(savedStoriesTable)
        .where(eq(savedStoriesTable.seriesId, body.seriesId))
        .orderBy(desc(savedStoriesTable.episodeNumber), desc(savedStoriesTable.createdAt))
        .limit(1)
        .then(([r]) => r ?? null),
      userId && childId
        ? loadMemoryForPrompt({ userId, childId, seriesId: body.seriesId })
        : Promise.resolve(null),
    ]);

    if (!lastStory) {
      res.status(404).json({ error: "No previous story found in this series." });
      return;
    }

    const previousSummary = lastStory.storySummary?.trim() || truncate(lastStory.story, 700);
    const interestsList = body.interests.join(", ");
    const wordCount = LENGTH_MAP[body.storyLength ?? "5min"] ?? LENGTH_MAP["5min"];
    const toneDesc = body.tone && body.tone in toneDescriptions ? toneDescriptions[body.tone] : "gentle and soothing";

    const memLines = memory ? memoryContextLines(memory) : [];
    const memSection = memLines.length > 0 ? `Story world memory — ${memLines.join(" ")}` : "";

    const systemPrompt = [
      `Write the next episode in a ${toneDesc} bedtime story series for a ${body.age}-year-old child named ${body.childName}.`,
      "Maintain the same characters, setting, and overall feel from the previous episode.",
      `Previous episode summary: ${previousSummary}`,
      memSection,
      `Include their interests: ${interestsList}.`,
      `The new episode should be approximately ${wordCount} words long.`,
      "Continue the narrative naturally from the previous episode.",
      "End with a soft bedtime conclusion that feels calm and satisfying.",
      'Respond ONLY with a valid JSON object: {"title": "...", "story": "...", "emoji": "..."}',
      "Do not include any text outside the JSON.",
    ].filter(Boolean).join(" ");

    const result = await generateStoryJson(
      systemPrompt,
      `Continue the story for ${body.childName}.`,
      body.interests
    );
    if ("error" in result) {
      res.status(500).json({ error: result.error });
      return;
    }

    const [summary] = await Promise.all([
      generateStorySummary(result.title, result.story, body.childName, body.interests),
      userId && childId
        ? upsertMemoryAfterStory({ userId, childId, seriesId: body.seriesId, title: result.title, story: result.story })
        : Promise.resolve(),
    ]);

    res.json({ ...result, summary });
  } catch (err) {
    req.log.error({ err }, "OpenAI API error");
    res.status(502).json({ error: "Could not reach the story magic right now — please try again!" });
  }
});

export default router;
