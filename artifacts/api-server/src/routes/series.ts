import { Router } from "express";
import { db, seriesTable, savedStoriesTable } from "@workspace/db";
import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

const SeriesBody = z.object({
  childId: z.number().int().positive(),
  title: z.string().min(1).max(100),
  theme: z.string().max(200).optional(),
});

const UpdateSeriesBody = z.object({
  title: z.string().min(1).max(100),
  theme: z.string().max(200).optional(),
});

router.get("/series", requireAuth, async (req: AuthRequest, res) => {
  const childId = req.query.childId ? Number(req.query.childId) : null;
  if (!childId || !Number.isFinite(childId)) {
    res.status(400).json({ error: "childId query param required." });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(seriesTable)
      .where(and(eq(seriesTable.userId, req.firebaseUid!), eq(seriesTable.childId, childId)))
      .orderBy(asc(seriesTable.createdAt));

    const enriched = await Promise.all(
      rows.map(async (s) => {
        const [{ storyCount }] = await db
          .select({ storyCount: count() })
          .from(savedStoriesTable)
          .where(eq(savedStoriesTable.seriesId, s.id));
        return { ...s, storyCount: storyCount ?? 0 };
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch series");
    res.status(500).json({ error: "Could not load series." });
  }
});

router.post("/series", requireAuth, async (req: AuthRequest, res) => {
  const result = SeriesBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid series data." });
    return;
  }
  const { childId, title, theme } = result.data;
  try {
    const [series] = await db
      .insert(seriesTable)
      .values({
        userId: req.firebaseUid!,
        childId,
        title,
        theme: theme ?? null,
        updatedAt: new Date(),
      })
      .returning();
    res.status(201).json({ ...series!, storyCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create series");
    res.status(500).json({ error: "Could not create series." });
  }
});

router.put("/series/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid series ID." });
    return;
  }
  const result = UpdateSeriesBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid series data." });
    return;
  }
  const { title, theme } = result.data;
  try {
    const [updated] = await db
      .update(seriesTable)
      .set({ title, theme: theme ?? null, updatedAt: new Date() })
      .where(and(eq(seriesTable.id, id), eq(seriesTable.userId, req.firebaseUid!)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Series not found or access denied." });
      return;
    }
    const [{ storyCount }] = await db
      .select({ storyCount: count() })
      .from(savedStoriesTable)
      .where(eq(savedStoriesTable.seriesId, id));
    res.json({ ...updated, storyCount: storyCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to update series");
    res.status(500).json({ error: "Could not update series." });
  }
});

router.delete("/series/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid series ID." });
    return;
  }
  try {
    const deleted = await db
      .delete(seriesTable)
      .where(and(eq(seriesTable.id, id), eq(seriesTable.userId, req.firebaseUid!)))
      .returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Series not found or access denied." });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete series");
    res.status(500).json({ error: "Could not delete series." });
  }
});

export default router;
