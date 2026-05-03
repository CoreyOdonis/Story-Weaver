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

const LENGTH_MAP: Record<"5min" | "10min" | "15min", string> = {
  "5min": "500–700",
  "10min": "900–1200",
  "15min": "1300–1800",
};

router.post("/generate-story", async (req, res) => {
  const result = GenerateStoryBody.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: result.error.message });
    return;
  }

  const { childName, age, interests, storyLength = "5min" } = result.data;
  const interestsList = interests.join(", ");
  const wordCount = LENGTH_MAP[storyLength] ?? LENGTH_MAP["5min"];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: [
            `Write a calming bedtime story for a ${age}-year-old child named ${childName}.`,
            `Include their interests: ${interestsList}.`,
            `The story should be approximately ${wordCount} words long.`,
            "Keep it gentle, imaginative, and suitable for bedtime.",
            "Include a clear beginning, middle, and end.",
            "End with a soothing, sleep-friendly conclusion.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Write a calming bedtime story for a ${age}-year-old child named ${childName}.`,
            `Include their interests: ${interestsList}.`,
            `The story should be approximately ${wordCount} words long.`,
            "Keep it gentle, imaginative, and suitable for bedtime.",
            "Include a clear beginning, middle, and end.",
            "End with a soothing, sleep-friendly conclusion.",
          ].join(" "),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as { title: string; story: string; emoji: string };

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
