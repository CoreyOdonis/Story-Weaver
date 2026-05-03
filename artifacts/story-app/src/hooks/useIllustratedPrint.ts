import { useState, useCallback } from "react";
import { useGenerateIllustrations } from "@workspace/api-client-react";

export type IllPrintStatus = "idle" | "generating" | "ready" | "error";

interface StoryData {
  title: string;
  story: string;
  childName: string;
  emoji: string;
}

export function useIllustratedPrint() {
  const [status, setStatus] = useState<IllPrintStatus>("idle");
  const [illustrations, setIllustrations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: generateIllustrations } = useGenerateIllustrations();

  const generate = useCallback(
    async (storyData: StoryData) => {
      setStatus("generating");
      setError(null);
      try {
        const { images } = await generateIllustrations({ data: storyData });
        setIllustrations(images);
        setStatus("ready");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Could not generate illustrations.";
        setError(msg);
        setStatus("error");
      }
    },
    [generateIllustrations]
  );

  const triggerPrint = useCallback((bw: boolean) => {
    if (bw) document.body.classList.add("print-bw");
    document.body.classList.add("print-illustrated");

    // Give browser one frame to apply classes before the print dialog
    requestAnimationFrame(() => {
      window.print();
      // Clean up after dialog closes
      setTimeout(() => {
        document.body.classList.remove("print-illustrated", "print-bw");
      }, 600);
    });
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setIllustrations([]);
    setError(null);
  }, []);

  return { status, illustrations, error, generate, triggerPrint, reset };
}
