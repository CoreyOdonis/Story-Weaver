import { Router } from "express";
import { db, savedStoriesTable } from "@workspace/db";
import { and, count, desc, eq, isNull, or } from "drizzle-orm";
import { optionalAuth } from "../middleware/optionalAuth";
import type { AuthRequest } from "../middleware/requireAuth";

const router = Router();

router.get("/saved-stories", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.firebaseUid ?? null;
    const childIdParam = req.query.childId ? Number(req.query.childId) : null;

    const userFilter = userId
      ? or(eq(savedStoriesTable.userId, userId), isNull(savedStoriesTable.userId))
      : isNull(savedStoriesTable.userId);

    const whereClause =
      childIdParam && userId
        ? and(eq(savedStoriesTable.userId, userId), eq(savedStoriesTable.childId, childIdParam))
        : userFilter;

    const stories = await db
      .select()
      .from(savedStoriesTable)
      .where(whereClause)
      .orderBy(desc(savedStoriesTable.createdAt));
    res.json(stories);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch saved stories");
    res.status(500).json({ error: "Could not load saved stories." });
  }
});

router.post("/saved-stories", optionalAuth, async (req: AuthRequest, res) => {
  const { childName, emoji, title, story, storySummary, interests, childId, seriesId, episodeNumber } = req.body as {
    childName?: string;
    emoji?: string;
    title?: string;
    story?: string;
    storySummary?: string;
    interests?: string;
    childId?: number;
    seriesId?: number;
    episodeNumber?: number;
  };

  if (!childName || !emoji || !title || !story || !interests) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  try {
    let computedEpisodeNumber: number | null = episodeNumber ?? null;
    if (seriesId && computedEpisodeNumber === null) {
      const [{ cnt }] = await db
        .select({ cnt: count() })
        .from(savedStoriesTable)
        .where(eq(savedStoriesTable.seriesId, seriesId));
      computedEpisodeNumber = (cnt ?? 0) + 1;
    }

    const [saved] = await db
      .insert(savedStoriesTable)
      .values({
        userId: req.firebaseUid ?? null,
        childId: childId ?? null,
        seriesId: seriesId ?? null,
        episodeNumber: computedEpisodeNumber,
        childName,
        emoji,
        title,
        story,
        interests,
      })
      .returning();

    res.status(201).json({
      ...saved,
      storySummary: storySummary ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to save story");
    res.status(500).json({ error: "Could not save story." });
  }
});

router.delete("/saved-stories/:id", optionalAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid story ID." });
    return;
  }

  try {
    const userId = req.firebaseUid ?? null;

    const whereClause = userId
      ? and(eq(savedStoriesTable.id, id), eq(savedStoriesTable.userId, userId))
      : and(eq(savedStoriesTable.id, id), isNull(savedStoriesTable.userId));

    const deleted = await db
      .delete(savedStoriesTable)
      .where(whereClause)
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "Story not found or access denied." });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete story");
    res.status(500).json({ error: "Could not delete story." });
  }
});

export default router;
