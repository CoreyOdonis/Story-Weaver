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

const LESSONS = [
  "the importance of being kind to others",
  "the courage to try something new even when nervous",
  "how sharing makes everyone happier",
  "that it is okay to ask for help",
  "how patience and gentleness solve problems better than rushing",
  "that every small act of helpfulness matters",
];

const SETTINGS = [
  "a sleepy meadow beneath a wide, starry sky",
  "a cozy village where the houses have soft glowing windows",
  "a gentle hillside forest where fireflies light the path",
  "a quiet seaside cove where waves whisper lullabies",
  "a cloud kingdom floating above a moonlit valley",
  "a warm countryside barn with the smell of hay and honey",
];

const STORY_STARTERS = [
  "It was the kind of evening when the stars appear one by one, like shy little friends peeking out to say hello.",
  "The sun had just tucked itself behind the hills, painting the sky in soft pinks and purples.",
  "A warm breeze carried the smell of flowers through the open window as the day slowly grew still.",
  "The moon had risen early tonight, big and round and golden, like a friendly face watching over the world.",
  "Everything was settling down for the night — the birds, the bees, the trees — and the world felt wonderfully peaceful.",
  "The last light of the day was a gentle, honeyed glow that made everything feel soft and safe.",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

router.post("/generate-story", async (req, res) => {
  const result = GenerateStoryBody.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: result.error.message });
    return;
  }

  const { childName, age, interests } = result.data;
  const interestsList = interests.join(", ");

  const lesson = pickRandom(LESSONS);
  const setting = pickRandom(SETTINGS);
  const starter = pickRandom(STORY_STARTERS);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: [
            "You are a warm, gentle children's bedtime story author. Your stories are soothing, safe, and leave children feeling calm and sleepy.",
            "",
            "TONE AND SAFETY RULES (follow strictly):",
            "- Tone must be slow, peaceful, and calming — never exciting, fast-paced, or suspenseful.",
            "- No scary elements: no villains, no danger, no conflict, no darkness, no loud noises, no chasing.",
            "- No intense emotions: no fear, no sadness, no anger. Only warmth, wonder, and gentle happiness.",
            "- Language should be simple and soothing. Short sentences. No cliffhangers.",
            "",
            "STORY STRUCTURE (required):",
            "- Beginning: Introduce the child by name and set the gentle scene. Use their name naturally in the first sentence.",
            "- Middle: A small, calm discovery or kind interaction tied to their interests. The child's name should appear 4–6 times across the whole story.",
            "- End: A soft, sleep-inviting conclusion. The last paragraph must gently guide the reader toward sleep — their eyes growing heavy, snuggling in, drifting off.",
            "",
            "LESSON (weave in naturally, never preach):",
            `- The story should carry a gentle lesson about: ${lesson}`,
            "- The lesson must emerge from what happens, not from a character explaining it.",
            "",
            "OUTPUT FORMAT:",
            "Respond with valid JSON only — no markdown, no extra text, no code fences.",
            'The JSON must have exactly three keys: "title" (short, charming, mentions the child\'s name or their world), "story" (4 paragraphs of story text, each separated by a blank line \\n\\n), and "emoji" (one emoji representing the story\'s theme).',
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            `Write a bedtime story for ${childName}, who is ${age} years old and loves: ${interestsList}.`,
            "",
            `Setting: ${setting}.`,
            `Opening feel: ${starter}`,
            "",
            `Use ${childName}'s name naturally throughout — at least 4 times across the story.`,
            "Keep the story to 4 paragraphs. Make each paragraph feel like a slow breath — unhurried and peaceful.",
            "The final paragraph must end with ${childName} closing their eyes and drifting gently to sleep.",
          ].join("\n"),
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
