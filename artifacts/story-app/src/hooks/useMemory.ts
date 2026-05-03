import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

function apiUrl(path: string): string {
  const base = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
  return `${base}api${path}`;
}

async function getToken(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken().catch(() => null);
}

export interface MemoryCharacter {
  name: string;
  description?: string;
}

export interface MemoryLocation {
  name: string;
  description?: string;
}

export interface StoryMemory {
  id: number;
  userId: string;
  childId: number;
  seriesId?: number | null;
  mainCharacters: MemoryCharacter[];
  sideCharacters: MemoryCharacter[];
  locations: MemoryLocation[];
  themes: string[];
  tonePreferences: string[];
  updatedAt: string;
}

interface UseMemoryOptions {
  childId: number | null;
  seriesId?: number | null;
}

export function useMemory({ childId, seriesId }: UseMemoryOptions) {
  const { firebaseUser } = useAuth();
  const [memory, setMemory] = useState<StoryMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!childId || !firebaseUser) return;
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ childId: String(childId) });
      if (seriesId) params.set("seriesId", String(seriesId));
      const res = await fetch(apiUrl(`/memory?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load memory");
      const data = (await res.json()) as StoryMemory[];
      setMemory(data);
    } catch {
      setError("Could not load story memory.");
    } finally {
      setLoading(false);
    }
  }, [childId, seriesId, firebaseUser]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateMemory = useCallback(
    async (patch: {
      mainCharacters?: MemoryCharacter[];
      sideCharacters?: MemoryCharacter[];
      locations?: MemoryLocation[];
      themes?: string[];
      tonePreferences?: string[];
    }): Promise<StoryMemory | undefined> => {
      if (!childId || !firebaseUser) return undefined;
      const token = await getToken();
      if (!token) return undefined;
      try {
        const res = await fetch(apiUrl("/memory"), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ childId, seriesId: seriesId ?? null, ...patch }),
        });
        if (!res.ok) throw new Error("Failed to update memory");
        const updated = (await res.json()) as StoryMemory;
        setMemory((prev) => {
          const idx = prev.findIndex((m) => m.id === updated.id);
          return idx >= 0 ? prev.map((m, i) => (i === idx ? updated : m)) : [...prev, updated];
        });
        return updated;
      } catch {
        setError("Could not update story memory.");
        return undefined;
      }
    },
    [childId, seriesId, firebaseUser]
  );

  const clearMemory = useCallback(async () => {
    if (!childId || !firebaseUser) return;
    const token = await getToken();
    if (!token) return;
    try {
      const params = new URLSearchParams({ childId: String(childId) });
      if (seriesId) params.set("seriesId", String(seriesId));
      const res = await fetch(apiUrl(`/memory?${params.toString()}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to clear memory");
      setMemory([]);
    } catch {
      setError("Could not clear story memory.");
    }
  }, [childId, seriesId, firebaseUser]);

  const primaryMemory = memory.find((m) => m.seriesId === (seriesId ?? null)) ?? memory[0] ?? null;

  return { memory, primaryMemory, loading, error, refresh: load, updateMemory, clearMemory };
}
