import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, googleProvider, firebaseConfigured } from "@/lib/firebase";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

interface UserProfile {
  userId: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function apiRequest(path: string, init?: RequestInit) {
  const baseUrl = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
  return fetch(`${baseUrl}api${path}`, {
    credentials: "include",
    ...init,
  });
}

async function syncUserWithBackend(user: User): Promise<UserProfile | null> {
  try {
    const idToken = await user.getIdToken(true);
    const res = await apiRequest("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) return null;
    return (await res.json()) as UserProfile;
  } catch {
    return null;
  }
}

async function fetchBackendUser(idToken: string): Promise<UserProfile | null> {
  try {
    const res = await apiRequest("/auth/user", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as UserProfile;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const idToken = await user.getIdToken().catch(() => null);
      if (!idToken) {
        await firebaseSignOut(auth).catch(() => undefined);
        setFirebaseUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const backendUser = await fetchBackendUser(idToken);
      if (backendUser) {
        setProfile(backendUser);
        setLoading(false);
        return;
      }

      const syncedUser = await syncUserWithBackend(user);
      if (syncedUser) {
        setProfile(syncedUser);
        setLoading(false);
        return;
      }

      await firebaseSignOut(auth).catch(() => undefined);
      setFirebaseUser(null);
      setProfile(null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth || !googleProvider) return;
    const result = await signInWithPopup(auth, googleProvider);
    const p = await syncUserWithBackend(result.user);
    setProfile(p);
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    setFirebaseUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, profile, loading, configured: firebaseConfigured, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
