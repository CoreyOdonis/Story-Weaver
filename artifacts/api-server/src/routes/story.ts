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

  const { childName, age, interests, storyLength = "5min" } = result.data;
  const interestsList = interests.join(", ");

  const lengthConfig: Record<string, { paragraphs: number; wordRange: string; nameCount: number }> = {
    "5min":  { paragraphs: 4,  wordRange: "350–450 words",   nameCount: 4  },
    "10min": { paragraphs: 7,  wordRange: "700–850 words",   nameCount: 6  },
    "15min": { paragraphs: 11, wordRange: "1100–1300 words", nameCount: 8  },
  };
  const { paragraphs, wordRange, nameCount } = lengthConfig[storyLength] ?? lengthConfig["5min"];

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
            "You are a children's bedtime storyteller. Your stories are magical but peaceful — full of wonder, warmth, and comfort.",
            "",
            "RULES (follow every one strictly):",
            `- Always include the child's name naturally — woven into the story as if they are really there, at least ${nameCount} times.`,
            "- Use gentle, calming language throughout. Sentences should be simple and rhythmic, like a lullaby — short, flowing, easy to follow.",
            "- Avoid all conflict or fear: no villains, no danger, no chasing, no darkness, no loud noises, no scary moments.",
            "- Include a small positive lesson that emerges naturally from what happens — never stated directly, never preached.",
            "- End with a soft, sleepy tone: the final paragraph must guide the child gently toward sleep — eyes heavy, body warm, drifting off peacefully.",
            "",
            "STYLE:",
            "- Magical but peaceful: enchanting details (glowing fireflies, whispering trees, moonbeams) without excitement or tension.",
            "- Warm and comforting: every image should feel like a soft blanket — safe, cozy, still.",
            "- Rhythm matters: vary sentence length gently. Some sentences short. Some a little longer, like a slow breath in and out.",
            "",
            "STORY STRUCTURE:",
            "- Beginning: Set the peaceful scene and introduce the child by name in the first sentence.",
            "- Middle: A small, calm discovery or kind moment tied to their interests. Gentle. Unhurried.",
            "- End: The world grows quieter. The child's eyes grow heavy. Sleep comes softly.",
            "",
            `LESSON TO WEAVE IN: ${lesson}`,
            "",
            "OUTPUT FORMAT:",
            "Respond with valid JSON only — no markdown, no extra text, no code fences.",
            `Exactly three keys: "title" (short, charming, warm), "story" (${paragraphs} paragraphs separated by \\n\\n — approximately ${wordRange} total), "emoji" (one emoji for the story's theme).`,
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
            `Use ${childName}'s name naturally at least ${nameCount} times.`,
            `Write exactly ${paragraphs} paragraphs — each one slow and peaceful, like a yawn. Total length: approximately ${wordRange}.`,
            `The last paragraph ends with ${childName} closing their eyes and drifting gently off to sleep.`,
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
