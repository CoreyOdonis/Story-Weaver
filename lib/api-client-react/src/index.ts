export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

export {
  usePostGenerateStory as useGenerateStory,
  usePostSavedStories as useSaveStory,
  useDeleteSavedStoriesId as useDeleteSavedStory,
  usePostStreakActivity as useRecordStreakActivity,
  usePostGenerateIllustrations as useGenerateIllustrations,
  useGetVoice as useGetVoiceProfile,
  useDeleteVoice as useDeleteVoiceProfile,
  getGetVoiceQueryKey as getGetVoiceProfileQueryKey,
  getGetVoiceQueryOptions as getGetVoiceProfileQueryOptions,
} from "./generated/api";
