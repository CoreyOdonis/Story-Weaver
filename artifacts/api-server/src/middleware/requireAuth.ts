import { type Request, type Response, type NextFunction } from "express";
import { getFirebaseAuth } from "../lib/firebase";

export interface AuthRequest extends Request {
  firebaseUid?: string;
  userEmail?: string;
  userName?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await getFirebaseAuth().verifyIdToken(token);
    req.firebaseUid = decoded.uid;
    req.userEmail = decoded.email;
    req.userName = decoded.name as string | undefined;
    next();
  } catch (err) {
    req.log.warn({ err }, "Firebase token verification failed");
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
