import { Router } from "express";
import { PostGenerateStoryBody } from "@workspace/api-zod";
import { db, savedStoriesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

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

function summarizeStory(story: string): string {
  const cleaned = story.replace(/\s+/g, " ").trim();
  return cleaned.length > 700 ? `${cleaned.slice(0, 700).trim()}…` : cleaned;
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

router.post("/generate-story", async (req, res) => {
  const result = PostGenerateStoryBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.message });
    return;
  }

  const { childName, age, interests, storyLength = "5min", tone } = result.data;
  const interestsList = interests.join(", ");
  const wordCount = LENGTH_MAP[storyLength] ?? LENGTH_MAP["5min"];
  const toneDesc = tone ? toneDescriptions[tone] : "gentle and soothing";

  const systemPrompt = [
    `Write a ${toneDesc} bedtime story for a ${age}-year-old child named ${childName}.`,
    `Include their interests: ${interestsList}.`,
    `The story should be approximately ${wordCount} words long.`,
    "Keep it imaginative and suitable for bedtime.",
    "Include a clear beginning, middle, and end.",
    "End with a soothing, sleep-friendly conclusion.",
    'Respond ONLY with a valid JSON object in this exact format: {"title": "...", "story": "...", "emoji": "..."}',
    "Do not include any text outside the JSON.",
  ].join(" ");

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
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "OpenAI API error");
    res.status(502).json({ error: "Could not reach the story magic right now — please try again!" });
  }
});

router.post("/continue-story", async (req, res) => {
  const body = req.body as {
    childName?: string;
    age?: number;
    interests?: string[];
    storyLength?: "5min" | "10min" | "15min";
    tone?: string;
    seriesId?: number;
  };

  if (!body.childName || !body.age || !Array.isArray(body.interests) || body.interests.length === 0 || !body.seriesId) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  try {
    const [lastStory] = await db
      .select()
      .from(savedStoriesTable)
      .where(eq(savedStoriesTable.seriesId, body.seriesId))
      .orderBy(desc(savedStoriesTable.episodeNumber), desc(savedStoriesTable.createdAt))
      .limit(1);

    if (!lastStory) {
      res.status(404).json({ error: "No previous story found in this series." });
      return;
    }

    const previousSummary = summarizeStory(lastStory.story);
    const interestsList = body.interests.join(", ");
    const wordCount = LENGTH_MAP[body.storyLength ?? "5min"] ?? LENGTH_MAP["5min"];
    const toneDesc = body.tone && body.tone in toneDescriptions ? toneDescriptions[body.tone] : "gentle and soothing";

    const systemPrompt = [
      `Write the next episode in a ${toneDesc} bedtime story series for a ${body.age}-year-old child named ${body.childName}.`,
      "Maintain the same characters, setting, and overall feel from the previous episode.",
      `Previous episode summary: ${previousSummary}`,
      `Include their interests: ${interestsList}.`,
      `The new episode should be approximately ${wordCount} words long.`,
      "Continue the narrative naturally from the previous episode.",
      "End with a soft bedtime conclusion that feels calm and satisfying.",
      'Respond ONLY with a valid JSON object in this exact format: {"title": "...", "story": "...", "emoji": "..."}',
      "Do not include any text outside the JSON.",
    ].join(" ");

    const result = await generateStoryJson(
      systemPrompt,
      `Continue the story for ${body.childName}.`,
      body.interests
    );
    if ("error" in result) {
      res.status(500).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "OpenAI API error");
    res.status(502).json({ error: "Could not reach the story magic right now — please try again!" });
  }
});

export default router;
