import { Router } from "express";
import { db, streaksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

router.get("/streak", async (req, res) => {
  const clientId = String(req.query.clientId ?? "").trim();
  if (!clientId) {
    res.status(400).json({ error: "Missing clientId" });
    return;
  }

  const [row] = await db
    .select()
    .from(streaksTable)
    .where(eq(streaksTable.clientId, clientId))
    .limit(1);

  if (!row) {
    res.json({ streakCount: 0, lastActivityDate: null });
    return;
  }

  res.json({ streakCount: row.streakCount, lastActivityDate: row.lastActivityDate });
});

router.post("/streak/activity", async (req, res) => {
  const clientId = String(req.body?.clientId ?? "").trim();
  if (!clientId) {
    res.status(400).json({ error: "Missing clientId" });
    return;
  }

  const today = todayStr();
  const yesterday = yesterdayStr();

  const [existing] = await db
    .select()
    .from(streaksTable)
    .where(eq(streaksTable.clientId, clientId))
    .limit(1);

  if (!existing) {
    await db.insert(streaksTable).values({
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
    .where(eq(streaksTable.clientId, clientId));

  res.json({ streakCount: newCount, increased: newCount > existing.streakCount });
});

export default router;
