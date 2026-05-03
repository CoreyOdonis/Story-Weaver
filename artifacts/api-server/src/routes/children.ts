import { Router } from "express";
import { db, childrenTable } from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

const ChildBody = z.object({
  name: z.string().min(1).max(50),
  age: z.number().int().min(1).max(12).nullable().optional(),
  interests: z.array(z.string()).optional(),
  defaultStoryLength: z.enum(["5min", "10min", "15min"]).nullable().optional(),
  tone: z.enum(["calm", "exciting", "silly", "adventurous", "magical"]).nullable().optional(),
});

function serialize(child: typeof childrenTable.$inferSelect) {
  return {
    id: child.id,
    userId: child.userId,
    name: child.name,
    age: child.age ?? null,
    interests: child.interests ? (JSON.parse(child.interests) as string[]) : [],
    defaultStoryLength: child.defaultStoryLength ?? null,
    tone: child.tone ?? null,
    createdAt: child.createdAt,
    updatedAt: child.updatedAt,
  };
}

router.get("/children", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(childrenTable)
      .where(eq(childrenTable.userId, req.firebaseUid!))
      .orderBy(asc(childrenTable.createdAt));
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch children");
    res.status(500).json({ error: "Could not load child profiles." });
  }
});

router.post("/children", requireAuth, async (req: AuthRequest, res) => {
  const result = ChildBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid child data." });
    return;
  }
  const { name, age, interests, defaultStoryLength, tone } = result.data;
  try {
    const [child] = await db
      .insert(childrenTable)
      .values({
        userId: req.firebaseUid!,
        name,
        age: age ?? null,
        interests: interests !== undefined ? JSON.stringify(interests) : null,
        defaultStoryLength: defaultStoryLength ?? null,
        tone: tone ?? null,
        updatedAt: new Date(),
      })
      .returning();
    res.status(201).json(serialize(child!));
  } catch (err) {
    req.log.error({ err }, "Failed to create child profile");
    res.status(500).json({ error: "Could not create child profile." });
  }
});

router.put("/children/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid child ID." });
    return;
  }
  const result = ChildBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid child data." });
    return;
  }
  const { name, age, interests, defaultStoryLength, tone } = result.data;
  try {
    const [updated] = await db
      .update(childrenTable)
      .set({
        name,
        age: age ?? null,
        interests: interests !== undefined ? JSON.stringify(interests) : undefined,
        defaultStoryLength: defaultStoryLength ?? null,
        tone: tone ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(childrenTable.id, id), eq(childrenTable.userId, req.firebaseUid!)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Child profile not found or access denied." });
      return;
    }
    res.json(serialize(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update child profile");
    res.status(500).json({ error: "Could not update child profile." });
  }
});

router.delete("/children/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid child ID." });
    return;
  }
  try {
    const deleted = await db
      .delete(childrenTable)
      .where(and(eq(childrenTable.id, id), eq(childrenTable.userId, req.firebaseUid!)))
      .returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Child profile not found or access denied." });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete child profile");
    res.status(500).json({ error: "Could not delete child profile." });
  }
});

export default router;
