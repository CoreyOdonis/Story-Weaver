import { useMemo } from "react";
import { usePostGenerateStory } from "@workspace/api-client-react";
import type { GenerateStoryRequestInterestsItem, GenerateStoryRequestTone } from "@workspace/api-client-react";
import { useSeries, type StorySeries } from "@/hooks/useSeries";
import { useChildren, type ChildProfile } from "@/hooks/useChildren";

export function useStoryActions(selectedChild: ChildProfile | null, selectedSeries: StorySeries | null) {
  const generateStoryMutation = usePostGenerateStory();
  const seriesHook = useSeries(selectedChild?.id ?? null);
  const childHook = useChildren();

  const canContinue = useMemo(() => Boolean(selectedChild && selectedSeries), [selectedChild, selectedSeries]);

  const continueStory = async (tone?: GenerateStoryRequestTone | null) => {
    if (!selectedChild || !selectedSeries) return null;
    const response = await fetch(`${import.meta.env.BASE_URL ?? "/"}api/continue-story`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childName: selectedChild.name,
        age: selectedChild.age ?? 5,
        interests: selectedChild.interests as GenerateStoryRequestInterestsItem[],
        storyLength: selectedChild.defaultStoryLength ?? "5min",
        tone: tone ?? selectedChild.tone,
        seriesId: selectedSeries.id,
        childId: selectedChild.id,
      }),
    });

    if (!response.ok) return null;
    return response.json() as Promise<{ title: string; story: string; emoji: string }>;
  };

  return { generateStoryMutation, continueStory, canContinue, seriesHook, childHook };
}
