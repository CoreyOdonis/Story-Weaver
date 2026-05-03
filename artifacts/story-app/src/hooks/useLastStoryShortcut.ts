import { useEffect, useState } from "react";

export interface LastStoryShortcut {
  childId: number;
  childName: string;
  seriesId: number | null;
  seriesTitle: string | null;
  storyId: number | null;
  storyTitle: string;
}

const STORAGE_KEY = "dreamtime_last_story_shortcut";

export function useLastStoryShortcut() {
  const [shortcut, setShortcut] = useState<LastStoryShortcut | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      setShortcut(JSON.parse(raw) as LastStoryShortcut);
    } catch {
      setShortcut(null);
    }
  }, []);

  const saveShortcut = (value: LastStoryShortcut) => {
    setShortcut(value);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {}
  };

  return { shortcut, saveShortcut };
}
