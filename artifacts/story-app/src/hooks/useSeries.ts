import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

function apiUrl(path: string): string {
  const base = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
  return `${base}api${path}`;
}

export interface StorySeries {
  id: number;
  userId: string;
  childId: number;
  title: string;
  theme: string | null;
  storyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSeriesInput {
  childId: number;
  title: string;
  theme?: string;
}

async function getToken(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken().catch(() => null);
}

export function useSeries(childId: number | null) {
  const { firebaseUser } = useAuth();
  const [series, setSeries] = useState<StorySeries[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSeries = useCallback(async (cid: number) => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/series?childId=${cid}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSeries((await res.json()) as StorySeries[]);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const createSeries = useCallback(async (data: CreateSeriesInput): Promise<StorySeries | null> => {
    const token = await getToken();
    if (!token) return null;
    try {
      const res = await fetch(apiUrl("/series"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = (await res.json()) as StorySeries;
        setSeries((prev) => [...prev, created]);
        return created;
      }
    } catch {
    }
    return null;
  }, []);

  const updateSeries = useCallback(async (id: number, data: { title: string; theme?: string }): Promise<StorySeries | null> => {
    const token = await getToken();
    if (!token) return null;
    try {
      const res = await fetch(apiUrl(`/series/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = (await res.json()) as StorySeries;
        setSeries((prev) => prev.map((s) => (s.id === id ? updated : s)));
        return updated;
      }
    } catch {
    }
    return null;
  }, []);

  const deleteSeries = useCallback(async (id: number): Promise<boolean> => {
    const token = await getToken();
    if (!token) return false;
    try {
      const res = await fetch(apiUrl(`/series/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSeries((prev) => prev.filter((s) => s.id !== id));
        return true;
      }
    } catch {
    }
    return false;
  }, []);

  useEffect(() => {
    if (firebaseUser && childId) {
      void fetchSeries(childId);
    } else {
      setSeries([]);
    }
  }, [firebaseUser, childId, fetchSeries]);

  return { series, loading, fetchSeries, createSeries, updateSeries, deleteSeries };
}
