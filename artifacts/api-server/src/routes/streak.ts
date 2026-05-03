import { Router } from "express";
import { db, streaksTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { optionalAuth } from "../middleware/optionalAuth";
import type { AuthRequest } from "../middleware/requireAuth";

const router = Router();

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function buildStreakKey(req: AuthRequest): { field: "userId" | "clientId"; value: string } | null {
  if (req.firebaseUid) return { field: "userId", value: req.firebaseUid };
  const clientId = String(req.query.clientId ?? req.body?.clientId ?? "").trim();
  if (clientId) return { field: "clientId", value: clientId };
  return null;
}

async function findStreakRow(key: { field: "userId" | "clientId"; value: string }) {
  const [row] = await db
    .select()
    .from(streaksTable)
    .where(key.field === "userId" ? eq(streaksTable.userId, key.value) : eq(streaksTable.clientId, key.value))
    .limit(1);
  return row ?? null;
}

router.get("/streak", optionalAuth, async (req: AuthRequest, res) => {
  const key = buildStreakKey(req);
  if (!key) {
    res.status(400).json({ error: "Missing clientId or auth token" });
    return;
  }

  const row = await findStreakRow(key);

  if (!row) {
    res.json({ streakCount: 0, lastActivityDate: null });
    return;
  }

  res.json({ streakCount: row.streakCount, lastActivityDate: row.lastActivityDate });
});

router.post("/streak/activity", optionalAuth, async (req: AuthRequest, res) => {
  const key = buildStreakKey(req);
  if (!key) {
    res.status(400).json({ error: "Missing clientId or auth token" });
    return;
  }

  const today = todayStr();
  const yesterday = yesterdayStr();

  const existing = await findStreakRow(key);

  if (!existing) {
    const clientId = key.field === "clientId" ? key.value : `user:${key.value}`;
    await db.insert(streaksTable).values({
      userId: key.field === "userId" ? key.value : null,
      clientId,
      lastActivityDate: today,
      streakCount: 1,
      updatedAt: new Date(),
    });
    res.json({ streakCount: 1, increased: true });
    return;
  }

  if (existing.lastActivityDate === today) {
    res.json({ streakCount: existing.streakCount, increased: false });
    return;
  }

  const newCount = existing.lastActivityDate === yesterday
    ? existing.streakCount + 1
    : 1;

  await db
    .update(streaksTable)
    .set({ streakCount: newCount, lastActivityDate: today, updatedAt: new Date() })
    .where(eq(streaksTable.id, existing.id));

  res.json({ streakCount: newCount, increased: newCount > existing.streakCount });
});

export default router;
