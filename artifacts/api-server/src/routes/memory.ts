import { Router } from "express";
import { db, storyMemoryTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const CharacterSchema = z.object({ name: z.string(), description: z.string().optional() });
const LocationSchema = z.object({ name: z.string(), description: z.string().optional() });

const MemoryUpdateBody = z.object({
  childId: z.number().int().positive(),
  seriesId: z.number().int().positive().nullable().optional(),
  mainCharacters: z.array(CharacterSchema).optional(),
  sideCharacters: z.array(CharacterSchema).optional(),
  locations: z.array(LocationSchema).optional(),
  themes: z.array(z.string()).optional(),
  tonePreferences: z.array(z.string()).optional(),
});

function serializeMemory(row: typeof storyMemoryTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    childId: row.childId,
    seriesId: row.seriesId,
    mainCharacters: JSON.parse(row.mainCharacters) as Array<{ name: string; description?: string }>,
    sideCharacters: JSON.parse(row.sideCharacters) as Array<{ name: string; description?: string }>,
    locations: JSON.parse(row.locations) as Array<{ name: string; description?: string }>,
    themes: JSON.parse(row.themes) as string[],
    tonePreferences: JSON.parse(row.tonePreferences) as string[],
    updatedAt: row.updatedAt,
  };
}

router.get("/memory", requireAuth, async (req: AuthRequest, res) => {
  const childId = req.query.childId ? Number(req.query.childId) : null;
  const seriesId = req.query.seriesId ? Number(req.query.seriesId) : null;

  if (!childId || !Number.isFinite(childId)) {
    res.status(400).json({ error: "childId query param required." });
    return;
  }

  try {
    const conditions = [
      eq(storyMemoryTable.userId, req.firebaseUid!),
      eq(storyMemoryTable.childId, childId),
    ];

    if (seriesId) {
      conditions.push(eq(storyMemoryTable.seriesId, seriesId));
    }

    const rows = await db
      .select()
      .from(storyMemoryTable)
      .where(and(...conditions));

    res.json(rows.map(serializeMemory));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch story memory");
    res.status(500).json({ error: "Could not load story memory." });
  }
});

router.put("/memory", requireAuth, async (req: AuthRequest, res) => {
  const result = MemoryUpdateBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid memory data." });
    return;
  }

  const { childId, seriesId, mainCharacters, sideCharacters, locations, themes, tonePreferences } = result.data;

  try {
    const conditions = [
      eq(storyMemoryTable.userId, req.firebaseUid!),
      eq(storyMemoryTable.childId, childId),
    ];
    if (seriesId) {
      conditions.push(eq(storyMemoryTable.seriesId, seriesId));
    }

    const existing = await db
      .select()
      .from(storyMemoryTable)
      .where(and(...conditions))
      .limit(1);

    const patch = {
      ...(mainCharacters !== undefined && { mainCharacters: JSON.stringify(mainCharacters) }),
      ...(sideCharacters !== undefined && { sideCharacters: JSON.stringify(sideCharacters) }),
      ...(locations !== undefined && { locations: JSON.stringify(locations) }),
      ...(themes !== undefined && { themes: JSON.stringify(themes) }),
      ...(tonePreferences !== undefined && { tonePreferences: JSON.stringify(tonePreferences) }),
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      const [updated] = await db
        .update(storyMemoryTable)
        .set(patch)
        .where(and(...conditions))
        .returning();
      res.json(serializeMemory(updated!));
    } else {
      const [created] = await db
        .insert(storyMemoryTable)
        .values({
          userId: req.firebaseUid!,
          childId,
          seriesId: seriesId ?? null,
          mainCharacters: JSON.stringify(mainCharacters ?? []),
          sideCharacters: JSON.stringify(sideCharacters ?? []),
          locations: JSON.stringify(locations ?? []),
          themes: JSON.stringify(themes ?? []),
          tonePreferences: JSON.stringify(tonePreferences ?? []),
          updatedAt: new Date(),
        })
        .returning();
      res.json(serializeMemory(created!));
    }
  } catch (err) {
    req.log.error({ err }, "Failed to update story memory");
    res.status(500).json({ error: "Could not update story memory." });
  }
});

router.delete("/memory", requireAuth, async (req: AuthRequest, res) => {
  const childId = req.query.childId ? Number(req.query.childId) : null;
  const seriesId = req.query.seriesId ? Number(req.query.seriesId) : null;

  if (!childId || !Number.isFinite(childId)) {
    res.status(400).json({ error: "childId query param required." });
    return;
  }

  try {
    const conditions = [
      eq(storyMemoryTable.userId, req.firebaseUid!),
      eq(storyMemoryTable.childId, childId),
    ];
    if (seriesId) {
      conditions.push(eq(storyMemoryTable.seriesId, seriesId));
    }

    await db.delete(storyMemoryTable).where(and(...conditions));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete story memory");
    res.status(500).json({ error: "Could not delete story memory." });
  }
});

export interface ExtractedMemory {
  mainCharacters: Array<{ name: string; description: string }>;
  sideCharacters: Array<{ name: string; description: string }>;
  locations: Array<{ name: string; description: string }>;
  themes: string[];
  tonePreferences: string[];
}

export async function extractMemoryFromStory(
  title: string,
  story: string,
  existingMemory: ExtractedMemory | null
): Promise<ExtractedMemory | null> {
  const existingContext = existingMemory
    ? `Existing memory: ${JSON.stringify(existingMemory)}`
    : "No existing memory.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 1024,
    messages: [
      {
        role: "system",
        content: [
          "Extract story elements from the given bedtime story.",
          existingContext,
          "Merge with existing memory — do not duplicate entries, update descriptions where richer detail is available.",
          "Return ONLY valid JSON with this shape:",
          '{"mainCharacters":[{"name":"...","description":"..."}],"sideCharacters":[{"name":"...","description":"..."}],"locations":[{"name":"...","description":"..."}],"themes":["..."],"tonePreferences":["..."]}',
          "mainCharacters: the 1-3 most central recurring characters.",
          "sideCharacters: supporting characters who appear less prominently.",
          "locations: distinct places or worlds the story takes place in.",
          "themes: 2-5 short thematic labels (e.g. 'friendship', 'courage', 'magic').",
          "tonePreferences: observed tone words (e.g. 'gentle', 'whimsical', 'exciting').",
          "Keep names concise. Descriptions max 20 words each. No text outside JSON.",
        ].join(" "),
      },
      {
        role: "user",
        content: `Title: ${title}\n\n${story.slice(0, 1500)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as ExtractedMemory;
  } catch {
    return null;
  }
}

export async function upsertMemoryAfterStory(params: {
  userId: string;
  childId: number;
  seriesId: number | null;
  title: string;
  story: string;
}): Promise<void> {
  const { userId, childId, seriesId, title, story } = params;

  try {
    const conditions = [
      eq(storyMemoryTable.userId, userId),
      eq(storyMemoryTable.childId, childId),
    ];
    if (seriesId) conditions.push(eq(storyMemoryTable.seriesId, seriesId));

    const [existing] = await db
      .select()
      .from(storyMemoryTable)
      .where(and(...conditions))
      .limit(1);

    const existingMemory: ExtractedMemory | null = existing
      ? {
          mainCharacters: JSON.parse(existing.mainCharacters) as ExtractedMemory["mainCharacters"],
          sideCharacters: JSON.parse(existing.sideCharacters) as ExtractedMemory["sideCharacters"],
          locations: JSON.parse(existing.locations) as ExtractedMemory["locations"],
          themes: JSON.parse(existing.themes) as string[],
          tonePreferences: JSON.parse(existing.tonePreferences) as string[],
        }
      : null;

    const extracted = await extractMemoryFromStory(title, story, existingMemory);
    if (!extracted) return;

    const values = {
      mainCharacters: JSON.stringify(extracted.mainCharacters),
      sideCharacters: JSON.stringify(extracted.sideCharacters),
      locations: JSON.stringify(extracted.locations),
      themes: JSON.stringify(extracted.themes),
      tonePreferences: JSON.stringify(extracted.tonePreferences),
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(storyMemoryTable)
        .set(values)
        .where(and(...conditions));
    } else {
      await db.insert(storyMemoryTable).values({
        userId,
        childId,
        seriesId: seriesId ?? null,
        ...values,
      });
    }
  } catch {
    // Memory extraction is best-effort — don't fail the story request
  }
}

export async function loadMemoryForPrompt(params: {
  userId: string;
  childId: number;
  seriesId: number | null;
}): Promise<ExtractedMemory | null> {
  const { userId, childId, seriesId } = params;
  try {
    const conditions = [
      eq(storyMemoryTable.userId, userId),
      eq(storyMemoryTable.childId, childId),
    ];
    if (seriesId) conditions.push(eq(storyMemoryTable.seriesId, seriesId));

    const [row] = await db
      .select()
      .from(storyMemoryTable)
      .where(and(...conditions))
      .limit(1);

    if (!row) return null;

    return {
      mainCharacters: JSON.parse(row.mainCharacters) as ExtractedMemory["mainCharacters"],
      sideCharacters: JSON.parse(row.sideCharacters) as ExtractedMemory["sideCharacters"],
      locations: JSON.parse(row.locations) as ExtractedMemory["locations"],
      themes: JSON.parse(row.themes) as string[],
      tonePreferences: JSON.parse(row.tonePreferences) as string[],
    };
  } catch {
    return null;
  }
}

export default router;
