import { useState, useEffect } from "react";

const STORAGE_KEY = "dreamtime_client_id";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useClientId(): string {
  const [clientId, setClientId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
      const fresh = generateId();
      localStorage.setItem(STORAGE_KEY, fresh);
      return fresh;
    } catch {
      return generateId();
    }
  });

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, clientId);
      }
    } catch {}
  }, [clientId]);

  return clientId;
}
