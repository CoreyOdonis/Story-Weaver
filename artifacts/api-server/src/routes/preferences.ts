import { Router } from "express";
import { db, preferencesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

const PreferencesBody = z.object({
  childName: z.string().max(50).nullable().optional(),
  age: z.number().int().min(1).max(12).nullable().optional(),
  interests: z.array(z.string()).optional(),
  storyLength: z.enum(["5min", "10min", "15min"]).optional(),
});

router.get("/preferences", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [prefs] = await db
      .select()
      .from(preferencesTable)
      .where(eq(preferencesTable.userId, req.firebaseUid!))
      .limit(1);

    if (!prefs) {
      res.json({ childName: null, age: null, interests: [], storyLength: null });
      return;
    }

    res.json({
      childName: prefs.childName ?? null,
      age: prefs.age ?? null,
      interests: prefs.interests ? (JSON.parse(prefs.interests) as string[]) : [],
      storyLength: prefs.storyLength ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch preferences");
    res.status(500).json({ error: "Could not load preferences" });
  }
});

router.put("/preferences", requireAuth, async (req: AuthRequest, res) => {
  const result = PreferencesBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid preferences data" });
    return;
  }

  const { childName, age, interests, storyLength } = result.data;

  try {
    const [saved] = await db
      .insert(preferencesTable)
      .values({
        userId: req.firebaseUid!,
        childName: childName ?? null,
        age: age ?? null,
        interests: interests !== undefined ? JSON.stringify(interests) : null,
        storyLength: storyLength ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: preferencesTable.userId,
        set: {
          ...(childName !== undefined && { childName: childName ?? null }),
          ...(age !== undefined && { age: age ?? null }),
          ...(interests !== undefined && { interests: JSON.stringify(interests) }),
          ...(storyLength !== undefined && { storyLength: storyLength ?? null }),
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({
      childName: saved!.childName ?? null,
      age: saved!.age ?? null,
      interests: saved!.interests ? (JSON.parse(saved!.interests) as string[]) : [],
      storyLength: saved!.storyLength ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to save preferences");
    res.status(500).json({ error: "Could not save preferences" });
  }
});

export default router;
