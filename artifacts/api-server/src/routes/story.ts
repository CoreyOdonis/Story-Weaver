import { Router } from "express";
import { PostGenerateStoryBody } from "@workspace/api-zod";
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
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate a ${toneDesc} bedtime story for ${childName}, age ${age}, who loves: ${interestsList}. Length: ~${wordCount} words.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    let parsed: { title?: string; story?: string; emoji?: string };
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] ?? raw) as typeof parsed;
    } catch {
      req.log.error({ raw }, "Failed to parse OpenAI JSON response");
      res.status(500).json({ error: "Story generation failed — please try again." });
      return;
    }

    if (!parsed.title || !parsed.story || !parsed.emoji) {
      req.log.error({ parsed }, "OpenAI response missing required fields");
      res.status(500).json({ error: "Story generation failed — please try again." });
      return;
    }

    res.json({
      title: parsed.title,
      story: parsed.story,
      emoji: parsed.emoji || pickEmoji(interests),
    });
  } catch (err) {
    req.log.error({ err }, "OpenAI API error");
    res.status(502).json({ error: "Could not reach the story magic right now — please try again!" });
  }
});

export default router;
