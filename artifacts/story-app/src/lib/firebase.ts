import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;

export const firebaseConfigured = Boolean(apiKey && authDomain && projectId && appId);

const firebaseConfig = { apiKey, authDomain, projectId, appId };

const app = firebaseConfigured
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!)
  : null;

export const auth = app ? getAuth(app) : null;
export const googleProvider = firebaseConfigured ? (() => {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  return p;
})() : null;
