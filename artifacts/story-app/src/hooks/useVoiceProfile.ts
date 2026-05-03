import { useState, useCallback } from "react";
import {
  useGetVoice,
  useDeleteVoice,
  getGetVoiceQueryKey,
  getGetVoiceQueryOptions,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useClientId } from "./useClientId";

export type VoiceUploadStatus = "idle" | "uploading" | "error";

export type VoiceStatus =
  | "loading"
  | "none"
  | "active"
  | "uploading"
  | "error";

export interface VoiceProfileState {
  status: VoiceStatus;
  voiceId: string | null;
  voiceName: string | null;
  uploadError: string | null;
  upload: (file: File, name?: string) => Promise<void>;
  remove: () => Promise<void>;
  isDeleting: boolean;
}

export function useVoiceProfile(): VoiceProfileState {
  const clientId = useClientId();
  const queryClient = useQueryClient();

  const [uploadStatus, setUploadStatus] = useState<VoiceUploadStatus>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data, isLoading } = useGetVoice(
    { clientId: clientId ?? "" },
    {
      query: {
        queryKey: getGetVoiceQueryKey({ clientId: clientId ?? "" }),
        enabled: !!clientId,
        retry: false,
      },
    },
  );

  const deleteProfileMutation = useDeleteVoice();

  const upload = useCallback(
    async (file: File, name = "My Voice") => {
      if (!clientId) return;
      setUploadStatus("uploading");
      setUploadError(null);

      try {
        const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
        const formData = new FormData();
        formData.append("audio", file, file.name);
        formData.append("clientId", clientId);
        formData.append("voiceName", name);

        const res = await fetch(`${base}/api/voice/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(
            (json as { error?: string }).error ?? "Upload failed — please try again."
          );
        }

        await queryClient.invalidateQueries({
          queryKey: getGetVoiceQueryKey({ clientId }),
        });
        setUploadStatus("idle");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Upload failed — please try again.";
        setUploadError(msg);
        setUploadStatus("error");
      }
    },
    [clientId, queryClient]
  );

  const remove = useCallback(async () => {
    if (!clientId) return;
    await deleteProfileMutation.mutateAsync({ params: { clientId } });
    await queryClient.invalidateQueries({
      queryKey: getGetVoiceQueryKey({ clientId }),
    });
  }, [clientId, deleteProfileMutation, queryClient]);

  const status: VoiceStatus =
    isLoading
      ? "loading"
      : uploadStatus === "uploading"
        ? "uploading"
        : uploadStatus === "error"
          ? "error"
          : data?.voiceId
            ? "active"
            : "none";

  return {
    status,
    voiceId: data?.voiceId ?? null,
    voiceName: data?.voiceName ?? null,
    uploadError,
    upload,
    remove,
    isDeleting: deleteProfileMutation.isPending,
  };
}
