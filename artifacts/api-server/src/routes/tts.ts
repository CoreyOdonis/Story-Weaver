import { Router } from "express";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";

const router = Router();

router.post("/tts", async (req, res) => {
  const { text } = req.body as { text?: string };

  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Missing required field: text" });
    return;
  }

  if (text.length > 8000) {
    res.status(400).json({ error: "Text too long (max 8000 characters)." });
    return;
  }

  try {
    const audioBuffer = await textToSpeech(text, "nova", "mp3");

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.byteLength),
      "Cache-Control": "no-store",
    });
    res.send(audioBuffer);
  } catch (err) {
    req.log.error({ err }, "TTS generation failed");
    res.status(502).json({ error: "Could not generate audio — please try again." });
  }
});

export default router;
