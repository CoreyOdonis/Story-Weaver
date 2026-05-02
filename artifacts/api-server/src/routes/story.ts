import { Router } from "express";
import { GenerateStoryBody } from "@workspace/api-zod";
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

function pickEmoji(interests: string[]): string {
  const first = interests[0];
  return first ? (interestEmojis[first] ?? "⭐") : "⭐";
}

router.post("/generate-story", async (req, res) => {
  const result = GenerateStoryBody.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: result.error.message });
    return;
  }

  const { childName, age, interests } = result.data;
  const interestsList = interests.join(", ");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content:
            "You are a warm, imaginative children's story author who specializes in soothing bedtime stories. " +
            "Always respond with valid JSON only — no markdown, no extra text. " +
            'The JSON must have exactly three fields: "title" (a short, charming story title), ' +
            '"story" (the full story text, 3-5 paragraphs, ending with a gentle sleep-friendly conclusion), ' +
            'and "emoji" (a single emoji that best represents the story theme).',
        },
        {
          role: "user",
          content:
            `Write a calming, imaginative bedtime story for a ${age}-year-old child named ${childName}. ` +
            `Include their interests: ${interestsList}. ` +
            `Make the story gentle, positive, and suitable for bedtime. ` +
            `End with a soothing, sleep-friendly conclusion.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    let parsed: { title: string; story: string; emoji: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "OpenAI returned non-JSON response");
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
