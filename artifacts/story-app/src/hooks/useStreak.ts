import { useEffect, useRef, useState } from "react";
import {
  useGetStreak,
  useRecordStreakActivity,
  getGetStreakQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useClientId } from "./useClientId";

export interface StreakState {
  streakCount: number;
  justIncreased: boolean;
  recordActivity: () => void;
}

export function useStreak(): StreakState {
  const clientId = useClientId();
  const queryClient = useQueryClient();
  const [justIncreased, setJustIncreased] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data } = useGetStreak(
    { clientId },
    { query: { queryKey: getGetStreakQueryKey({ clientId }), enabled: !!clientId } }
  );

  const { mutate: recordActivity } = useRecordStreakActivity({
    mutation: {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getGetStreakQueryKey({ clientId }) });
        if (result.increased) {
          setJustIncreased(true);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setJustIncreased(false), 3000);
        }
      },
    },
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    streakCount: data?.streakCount ?? 0,
    justIncreased,
    recordActivity: () => recordActivity({ data: { clientId } }),
  };
}
