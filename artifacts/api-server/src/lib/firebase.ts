import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let firebaseApp: App | undefined;
let firebaseAuth: Auth | undefined;

function getFirebaseApp(): App {
  if (!firebaseApp) {
    const existing = getApps();
    if (existing.length > 0) {
      firebaseApp = existing[0]!;
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const rawKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !rawKey) {
        throw new Error(
          "Firebase Admin SDK not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.",
        );
      }

      const privateKey = rawKey.replace(/\\n/g, "\n");

      firebaseApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    }
  }
  return firebaseApp;
}

export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp());
  }
  return firebaseAuth;
}

export function tryGetFirebaseAuth(): Auth | null {
  try {
    return getFirebaseAuth();
  } catch {
    return null;
  }
}
