import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

function apiUrl(path: string): string {
  const base = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
  return `${base}api${path}`;
}

export interface UserPreferences {
  childName: string | null;
  age: number | null;
  interests: string[];
  storyLength: "5min" | "10min" | "15min" | null;
}

async function getToken(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken().catch(() => null);
}

export function usePreferences() {
  const { firebaseUser } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPreferences = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/preferences"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPreferences((await res.json()) as UserPreferences);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const savePreferences = useCallback(async (data: Partial<UserPreferences>) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(apiUrl("/preferences"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setPreferences((await res.json()) as UserPreferences);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      fetchPreferences();
    } else {
      setPreferences(null);
    }
  }, [firebaseUser, fetchPreferences]);

  return { preferences, loading, savePreferences };
}
