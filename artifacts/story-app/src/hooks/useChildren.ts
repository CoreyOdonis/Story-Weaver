import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

function apiUrl(path: string): string {
  const base = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
  return `${base}api${path}`;
}

export interface ChildProfile {
  id: number;
  name: string;
  age: number | null;
  interests: string[];
  defaultStoryLength: "5min" | "10min" | "15min" | null;
  tone: "calm" | "exciting" | "silly" | "adventurous" | "magical" | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChildInput {
  name: string;
  age?: number | null;
  interests?: string[];
  defaultStoryLength?: "5min" | "10min" | "15min" | null;
  tone?: "calm" | "exciting" | "silly" | "adventurous" | "magical" | null;
}

async function getToken(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken().catch(() => null);
}

export function useChildren() {
  const { firebaseUser } = useAuth();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchChildren = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/children"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setChildren((await res.json()) as ChildProfile[]);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const createChild = useCallback(async (data: CreateChildInput): Promise<ChildProfile | null> => {
    const token = await getToken();
    if (!token) return null;
    try {
      const res = await fetch(apiUrl("/children"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = (await res.json()) as ChildProfile;
        setChildren((prev) => [...prev, created]);
        return created;
      }
    } catch {
    }
    return null;
  }, []);

  const updateChild = useCallback(async (id: number, data: CreateChildInput): Promise<ChildProfile | null> => {
    const token = await getToken();
    if (!token) return null;
    try {
      const res = await fetch(apiUrl(`/children/${id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = (await res.json()) as ChildProfile;
        setChildren((prev) => prev.map((c) => (c.id === id ? updated : c)));
        return updated;
      }
    } catch {
    }
    return null;
  }, []);

  const deleteChild = useCallback(async (id: number): Promise<boolean> => {
    const token = await getToken();
    if (!token) return false;
    try {
      const res = await fetch(apiUrl(`/children/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setChildren((prev) => prev.filter((c) => c.id !== id));
        return true;
      }
    } catch {
    }
    return false;
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      void fetchChildren();
    } else {
      setChildren([]);
    }
  }, [firebaseUser, fetchChildren]);

  return { children, loading, fetchChildren, createChild, updateChild, deleteChild };
}
