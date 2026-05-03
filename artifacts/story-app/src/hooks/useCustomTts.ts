import { useState, useRef, useEffect, useCallback } from "react";

export type CustomTtsState = "idle" | "loading" | "playing" | "paused" | "error";

export interface CustomTtsControls {
  state: CustomTtsState;
  currentTime: number;
  duration: number;
  progress: number;
  toggle: () => void;
  stop: () => void;
  errorMessage: string | null;
}

export function useCustomTts(
  storyText: string | null,
  voiceId: string | null
): CustomTtsControls {
  const [state, setState] = useState<CustomTtsState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setState("idle");
      setCurrentTime(0);
      setDuration(0);
      setErrorMessage(null);
    };
  }, [storyText, voiceId]);

  const attachListeners = useCallback((audio: HTMLAudioElement) => {
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.ondurationchange = () => setDuration(audio.duration || 0);
    audio.onended = () => {
      setState("paused");
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    audio.onerror = () => {
      setState("error");
      setErrorMessage("Playback failed — please try again.");
    };
  }, []);

  const fetchAndPlay = useCallback(async () => {
    if (!storyText || !voiceId) return;
    setState("loading");
    setErrorMessage(null);

    try {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${base}/api/voice-tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: storyText, voiceId }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? "Audio fetch failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      attachListeners(audio);

      await audio.play();
      setState("playing");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not load audio.";
      setState("error");
      setErrorMessage(msg);
    }
  }, [storyText, voiceId, attachListeners]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;

    if (state === "idle" || state === "error") {
      fetchAndPlay();
      return;
    }
    if (!audio) return;

    if (state === "playing") {
      audio.pause();
      setState("paused");
    } else if (state === "paused") {
      audio.play()
        .then(() => setState("playing"))
        .catch(() => {
          setState("error");
          setErrorMessage("Playback failed — please try again.");
        });
    }
  }, [state, fetchAndPlay]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setState("idle");
    setCurrentTime(0);
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;

  return { state, currentTime, duration, progress, toggle, stop, errorMessage };
}
