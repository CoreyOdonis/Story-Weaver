import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getFirebaseAuth } from "../lib/firebase";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

const LoginBody = z.object({
  idToken: z.string().min(1, "idToken is required"),
});

router.post("/auth/login", async (req, res) => {
  const result = LoginBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

  const { idToken } = result.data;

  try {
    const decoded = await getFirebaseAuth().verifyIdToken(idToken);
    const { uid, email, name } = decoded;

    if (!email) {
      res.status(400).json({ error: "Google account must have an email address" });
      return;
    }

    const displayName = (name as string | undefined) ?? email.split("@")[0] ?? "User";

    const [user] = await db
      .insert(usersTable)
      .values({ uid, email, name: displayName })
      .onConflictDoUpdate({
        target: usersTable.uid,
        set: {
          name: displayName,
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({
      userId: user!.uid,
      name: user!.name,
      email: user!.email,
    });
  } catch (err) {
    req.log.error({ err }, "Auth login error");
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

router.get("/auth/user", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.uid, req.firebaseUid!))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found. Please sign in again." });
      return;
    }

    res.json({
      userId: user.uid,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    req.log.error({ err }, "Get user error");
    res.status(500).json({ error: "Failed to retrieve user" });
  }
});

export default router;
