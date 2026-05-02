import { Router } from "express";
import { db, savedStoriesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();

router.get("/saved-stories", async (req, res) => {
  try {
    const stories = await db
      .select()
      .from(savedStoriesTable)
      .orderBy(desc(savedStoriesTable.createdAt));
    res.json(stories);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch saved stories");
    res.status(500).json({ error: "Could not load saved stories." });
  }
});

router.post("/saved-stories", async (req, res) => {
  const { childName, emoji, title, story, interests } = req.body as {
    childName?: string;
    emoji?: string;
    title?: string;
    story?: string;
    interests?: string;
  };

  if (!childName || !emoji || !title || !story || !interests) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  try {
    const [saved] = await db
      .insert(savedStoriesTable)
      .values({ childName, emoji, title, story, interests })
      .returning();
    res.status(201).json(saved);
  } catch (err) {
    req.log.error({ err }, "Failed to save story");
    res.status(500).json({ error: "Could not save story." });
  }
});

router.delete("/saved-stories/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid story ID." });
    return;
  }

  try {
    const deleted = await db
      .delete(savedStoriesTable)
      .where(eq(savedStoriesTable.id, id))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "Story not found." });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete story");
    res.status(500).json({ error: "Could not delete story." });
  }
});

export default router;
