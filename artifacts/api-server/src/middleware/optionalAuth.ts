import { type Response, type NextFunction } from "express";
import { tryGetFirebaseAuth } from "../lib/firebase";
import type { AuthRequest } from "./requireAuth";

export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const firebaseAuth = tryGetFirebaseAuth();
      if (firebaseAuth) {
        const decoded = await firebaseAuth.verifyIdToken(token);
        req.firebaseUid = decoded.uid;
        req.userEmail = decoded.email;
        req.userName = decoded.name as string | undefined;
      }
    } catch {
      // Invalid or expired token — proceed as unauthenticated
    }
  }
  next();
}
