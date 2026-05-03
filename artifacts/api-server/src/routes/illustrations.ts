import { Router } from "express";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const STYLE =
  "Soft watercolor illustration for a children's bedtime storybook. " +
  "Gentle pastel colours, warm cozy night-time atmosphere, dreamy and magical. " +
  "No text, letters, or words anywhere in the image. Simple, charming, child-friendly.";

router.post("/generate-illustrations", async (req, res) => {
  const { story, title, childName, emoji } = req.body as {
    story?: string;
    title?: string;
    childName?: string;
    emoji?: string;
  };

  if (!story || typeof story !== "string" || story.length < 10) {
    res.status(400).json({ error: "Missing or invalid story text." });
    return;
  }

  const paragraphs = story.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const numScenes = Math.min(3, paragraphs.length);

  const sceneIndices =
    numScenes === 1 ? [0]
    : numScenes === 2 ? [0, paragraphs.length - 1]
    : [0, Math.floor((paragraphs.length - 1) / 2), paragraphs.length - 1];

  const sceneParagraphs = sceneIndices.map((i) => paragraphs[i]);

  try {
    const promptCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 600,
      messages: [
        {
          role: "system",
          content:
            "You write concise image-generation prompts for a children's storybook illustrator. " +
            "Each prompt must describe one visual scene: setting, mood, key characters or objects. " +
            "Keep each prompt under 60 words. No text in images. Respond with a valid JSON array of strings only.",
        },
        {
          role: "user",
          content: [
            `Story title: "${title ?? "Bedtime Story"}"`,
            `Main character: ${childName ?? "a child"}`,
            "",
            ...sceneParagraphs.map(
              (p, i) =>
                `Scene ${i + 1} (${["beginning", "middle", "end"][i]}):\n${p.slice(0, 300)}`
            ),
            "",
            `Respond ONLY with a JSON array of ${numScenes} image prompts.`,
          ].join("\n"),
        },
      ],
    });

    let prompts: string[] = sceneParagraphs.map((p) =>
      `${p.slice(0, 120)} — illustrated in a soft watercolor children's book style`
    );

    try {
      const raw = promptCompletion.choices[0]?.message?.content ?? "[]";
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        prompts = parsed;
      }
    } catch {
      req.log.warn("Could not parse illustration prompts from GPT — using fallback");
    }

    const imageBuffers = await Promise.all(
      prompts.map((prompt) =>
        generateImageBuffer(`${STYLE}\n\nScene: ${prompt}`, "1024x1024")
      )
    );

    const images = imageBuffers.map((buf) => buf.toString("base64"));
    res.json({ images });
  } catch (err) {
    req.log.error({ err }, "Illustration generation failed");
    res.status(502).json({ error: "Could not generate illustrations — please try again." });
  }
});

export default router;
