import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Star, RefreshCw, BookMarked, Trash2,
  ChevronDown, ChevronUp, Sparkles,
  Play, Pause, Volume2, Loader2, VolumeX,
} from "lucide-react";
import {
  useGenerateStory,
  useGetSavedStories,
  useSaveStory,
  useDeleteSavedStory,
  getGetSavedStoriesQueryKey,
} from "@workspace/api-client-react";
import { GenerateStoryRequestInterestsItem } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useReadAloud } from "@/hooks/useReadAloud";

const INTEREST_OPTIONS: { id: GenerateStoryRequestInterestsItem; label: string; icon: string }[] = [
  { id: "dinosaurs", label: "Dinosaurs", icon: "🦕" },
  { id: "space",     label: "Space",     icon: "🚀" },
  { id: "princess",  label: "Princess",  icon: "👑" },
  { id: "animals",   label: "Animals",   icon: "🐨" },
  { id: "cars",      label: "Cars",      icon: "🏎️" },
  { id: "magic",     label: "Magic",     icon: "✨" },
];

const formSchema = z.object({
  childName: z.string().min(1, "Please enter a name").max(50),
  age: z.coerce.number().min(1, "Age must be at least 1").max(12, "Age must be 12 or under"),
  interests: z.array(z.string()).min(1, "Select at least one interest"),
});

const STARS: { x: string; y: string; size: number; delay: number; duration: number }[] = [
  { x: "8%",  y: "6%",  size: 14, delay: 0,   duration: 2.8 },
  { x: "18%", y: "22%", size: 8,  delay: 1.1, duration: 3.4 },
  { x: "33%", y: "9%",  size: 10, delay: 0.5, duration: 2.5 },
  { x: "55%", y: "4%",  size: 7,  delay: 1.8, duration: 3.8 },
  { x: "72%", y: "14%", size: 12, delay: 0.3, duration: 2.2 },
  { x: "88%", y: "7%",  size: 9,  delay: 2.1, duration: 3.1 },
  { x: "92%", y: "28%", size: 6,  delay: 0.9, duration: 4.0 },
  { x: "5%",  y: "45%", size: 8,  delay: 1.5, duration: 2.9 },
  { x: "95%", y: "55%", size: 11, delay: 0.7, duration: 3.3 },
  { x: "12%", y: "75%", size: 7,  delay: 2.4, duration: 2.7 },
  { x: "80%", y: "80%", size: 9,  delay: 1.2, duration: 3.6 },
  { x: "45%", y: "92%", size: 8,  delay: 0.6, duration: 3.0 },
  { x: "65%", y: "88%", size: 6,  delay: 1.9, duration: 2.4 },
];

function formatTime(secs: number) {
  if (!isFinite(secs) || isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ── Read Aloud Player ── */
function ReadAloudPlayer({ storyText }: { storyText: string }) {
  const { state, currentTime, duration, progress, toggle, stop, errorMessage } = useReadAloud(storyText);

  const isLoading = state === "loading";
  const isPlaying = state === "playing";
  const isError   = state === "error";
  const isActive  = state === "playing" || state === "paused";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.5 }}
      className="mt-8 mb-2"
      data-testid="read-aloud-player"
    >
      <div className="rounded-2xl border border-white/10 bg-white/4 backdrop-blur-sm px-5 py-4">
        <div className="flex items-center gap-4">
          {/* Play / Pause button */}
          <motion.button
            whileHover={{ scale: isLoading ? 1 : 1.08 }}
            whileTap={{ scale: isLoading ? 1 : 0.93 }}
            onClick={toggle}
            disabled={isLoading}
            className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg
              ${isError
                ? "bg-destructive/20 border border-destructive/40 text-destructive"
                : isPlaying
                  ? "bg-primary text-primary-foreground shadow-[0_0_18px_hsl(262_72%_72%/0.45)]"
                  : "bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30"
              }`}
            aria-label={isPlaying ? "Pause" : "Play"}
            data-testid="read-aloud-toggle"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isError ? (
              <VolumeX className="w-5 h-5" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </motion.button>

          {/* Label + progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                  {isLoading ? "Preparing audio…" : isError ? "Read Aloud" : isActive ? "Now Playing" : "Read Aloud"}
                </span>
              </div>
              {isActive && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatTime(currentTime)}{duration > 0 ? ` / ${formatTime(duration)}` : ""}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                style={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ duration: 0.25, ease: "linear" }}
              />
            </div>

            {isError && errorMessage && (
              <p className="text-xs text-destructive mt-1.5">{errorMessage} Tap to retry.</p>
            )}
          </div>

          {/* Stop button — only visible when active */}
          <AnimatePresence>
            {isActive && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                whileTap={{ scale: 0.9 }}
                onClick={stop}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                aria-label="Stop"
                data-testid="read-aloud-stop"
              >
                {/* Stop square icon */}
                <span className="w-3 h-3 rounded-sm bg-current block" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Waveform bars — animated while playing */}
        {isPlaying && (
          <div className="flex items-end gap-[3px] justify-center mt-3 h-5" aria-hidden="true">
            {[0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.9, 0.65, 0.75, 0.45, 0.8, 0.55, 0.95].map((scale, i) => (
              <motion.span
                key={i}
                className="w-1 rounded-full bg-primary/70"
                animate={{ scaleY: [scale * 0.4, scale, scale * 0.5, scale * 0.8, scale * 0.3] }}
                transition={{ duration: 0.8 + i * 0.07, repeat: Infinity, ease: "easeInOut", delay: i * 0.06 }}
                style={{ height: "100%", originY: 1 }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5" data-testid="loading-dots">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-primary-foreground/80 inline-block"
          animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function LoadingOrbit() {
  return (
    <div className="flex flex-col items-center gap-6 py-8" data-testid="loading-orbit">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <span className="absolute text-secondary text-lg" style={{ top: 0, left: "50%", transform: "translateX(-50%)" }}>⭐</span>
        </motion.div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <span className="absolute text-base" style={{ bottom: 0, left: "50%", transform: "translateX(-50%)" }}>✨</span>
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="text-5xl z-10"
        >
          🌙
        </motion.div>
      </div>
      <div className="text-center space-y-2">
        <p className="font-serif text-primary text-lg font-semibold">Weaving your story...</p>
        <div className="flex justify-center"><LoadingDots /></div>
        <p className="text-muted-foreground text-sm">Sprinkling in a little magic</p>
      </div>
    </div>
  );
}

/* ── Saved story accordion item ── */
function SavedStoryCard({
  story,
  onDelete,
}: {
  story: { id: number; emoji: string; title: string; story: string; childName: string; interests: string; createdAt: string };
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const paragraphs = story.story.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const date = new Date(story.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="border-white/10 overflow-hidden backdrop-blur-sm">
        <button
          className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
          onClick={() => setExpanded((e) => !e)}
          data-testid={`saved-story-toggle-${story.id}`}
        >
          <span className="text-2xl shrink-0">{story.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-serif text-base font-semibold text-foreground truncate">{story.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{story.childName} · {date}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(story.id); }}
              className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              data-testid={`saved-story-delete-${story.id}`}
              aria-label="Delete story"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-6 pt-1 border-t border-white/8 space-y-4">
                {paragraphs.map((para, i) => (
                  <p key={i} className="font-story text-base leading-relaxed text-foreground/80">
                    {para}
                  </p>
                ))}
                <p className="text-xs text-muted-foreground pt-1">
                  Interests: {story.interests}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export default function Home() {
  const [generatedStory, setGeneratedStory] = useState<{
    title: string; story: string; emoji: string;
  } | null>(null);
  const [savedThisSession, setSavedThisSession] = useState(false);
  const [pendingInterests, setPendingInterests] = useState<string>("");
  const [showSaved, setShowSaved] = useState(false);

  const queryClient = useQueryClient();
  const generateStoryMutation = useGenerateStory();
  const saveStoryMutation = useSaveStory();
  const deleteStoryMutation = useDeleteSavedStory();
  const { data: savedStories, isLoading: savedLoading } = useGetSavedStories({
    query: { queryKey: getGetSavedStoriesQueryKey() },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { childName: "", age: 5, interests: [] },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setSavedThisSession(false);
    setPendingInterests(values.interests.join(", "));
    generateStoryMutation.mutate(
      { data: { childName: values.childName, age: values.age, interests: values.interests as GenerateStoryRequestInterestsItem[] } },
      { onSuccess: (result) => setGeneratedStory({ title: result.title, story: result.story, emoji: result.emoji }) }
    );
  };

  const handleSave = () => {
    if (!generatedStory || savedThisSession) return;
    const childName = form.getValues("childName");
    saveStoryMutation.mutate(
      { data: { childName, emoji: generatedStory.emoji, title: generatedStory.title, story: generatedStory.story, interests: pendingInterests } },
      {
        onSuccess: () => {
          setSavedThisSession(true);
          queryClient.invalidateQueries({ queryKey: getGetSavedStoriesQueryKey() });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteStoryMutation.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetSavedStoriesQueryKey() }) }
    );
  };

  const handleReset = () => {
    setGeneratedStory(null);
    setSavedThisSession(false);
    generateStoryMutation.reset();
    form.reset();
  };

  const paragraphs = generatedStory?.story.split(/\n\n+/).map((p) => p.trim()).filter(Boolean) ?? [];

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden flex flex-col items-center py-10 px-4 sm:px-8">

      {/* Stars */}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="star-twinkle pointer-events-none absolute select-none"
          style={{ left: s.x, top: s.y, fontSize: s.size, color: "hsl(43 95% 68%)", ["--tw-duration" as string]: `${s.duration}s`, animationDelay: `${s.delay}s` }}
          aria-hidden="true"
        >★</span>
      ))}

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="w-full max-w-2xl z-10">

        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="flex items-center justify-center gap-3 mb-2"
          >
            <Moon className="w-9 h-9 text-secondary moon-float fill-secondary/20" data-testid="icon-moon" />
            <h1 className="text-4xl sm:text-5xl font-serif text-primary drop-shadow-[0_0_24px_hsl(262_72%_72%/0.5)]" data-testid="text-app-title">
              Dreamtime Stories
            </h1>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }} className="text-muted-foreground text-lg">
            Magical bedtime tales, created just for you.
          </motion.p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── FORM ── */}
          {!generatedStory && (
            <motion.div key="form" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96, y: -16 }} transition={{ duration: 0.5 }}>
              <Card className="p-6 sm:p-8 shadow-2xl border-white/10 relative overflow-hidden backdrop-blur-sm">
                <div className="absolute -top-20 -right-20 w-56 h-56 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

                <AnimatePresence mode="wait">
                  {generateStoryMutation.isPending ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                      <LoadingOrbit />
                    </motion.div>
                  ) : (
                    <motion.div key="form-fields" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 relative z-10">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="childName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-serif text-foreground/90">Who is this story for?</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Child's name" className="h-12 text-base rounded-2xl bg-muted/40 border-white/10 placeholder:text-muted-foreground/50" {...field} data-testid="input-child-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="age"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-serif text-foreground/90">How old are they?</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="Age (1–12)" className="h-12 text-base rounded-2xl bg-muted/40 border-white/10 placeholder:text-muted-foreground/50" {...field} data-testid="input-child-age" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="interests"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-serif text-foreground/90">What do they love?</FormLabel>
                                <div className="flex flex-wrap gap-3 mt-2" data-testid="container-interests">
                                  {INTEREST_OPTIONS.map((interest) => {
                                    const isSelected = field.value.includes(interest.id);
                                    return (
                                      <motion.div key={interest.id} whileTap={{ scale: 0.93 }} whileHover={{ scale: 1.05 }}>
                                        <Badge
                                          variant={isSelected ? "default" : "outline"}
                                          className={`cursor-pointer px-4 py-2 text-sm rounded-full transition-all duration-300 select-none ${isSelected ? "bg-primary text-primary-foreground shadow-[0_0_14px_hsl(262_72%_72%/0.5)] border-primary/50" : "bg-muted/30 border-white/10 hover:bg-muted/50 text-foreground/80"}`}
                                          onClick={() => {
                                            if (isSelected) field.onChange(field.value.filter((id) => id !== interest.id));
                                            else field.onChange([...field.value, interest.id]);
                                          }}
                                          data-testid={`badge-interest-${interest.id}`}
                                        >
                                          <span className="mr-1.5 text-base">{interest.icon}</span>{interest.label}
                                        </Badge>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="pt-2">
                            <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                              <Button type="submit" size="lg" className="btn-shimmer w-full h-14 text-lg font-serif rounded-2xl text-white border-0 shadow-[0_0_28px_hsl(262_72%_72%/0.4)]" data-testid="button-generate-story">
                                <Star className="w-5 h-5 mr-2 fill-white/70" />
                                Create Magic
                              </Button>
                            </motion.div>
                          </div>
                        </form>
                      </Form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )}

          {/* ── STORY RESULT ── */}
          {generatedStory && (
            <motion.div key="story" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.8, ease: "easeOut" }}>
              <Card className="shadow-2xl border-white/10 relative overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-secondary opacity-90" />

                <div className="p-8 sm:p-12">
                  {/* Title & emoji */}
                  <div className="text-center mb-8">
                    <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.45, delay: 0.2 }} className="text-8xl mb-5 leading-none" data-testid="text-story-emoji">
                      {generatedStory.emoji}
                    </motion.div>
                    <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="text-2xl sm:text-3xl font-serif text-primary leading-snug" data-testid="text-story-title">
                      {generatedStory.title}
                    </motion.h2>
                    <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.55, duration: 0.5 }} className="flex items-center justify-center gap-3 mt-5">
                      <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50" />
                      <Sparkles className="w-4 h-4 text-secondary" />
                      <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50" />
                    </motion.div>
                  </div>

                  {/* Read Aloud Player */}
                  <ReadAloudPlayer storyText={generatedStory.story} />

                  {/* Story text */}
                  <div className="space-y-5 mt-8 mb-10" data-testid="text-story-content">
                    {paragraphs.map((para, i) => (
                      <motion.p key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.12, duration: 0.6 }} className="font-story text-lg sm:text-xl leading-[1.85] text-foreground/85 tracking-wide">
                        {para}
                      </motion.p>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.5 }} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 border-t border-white/10">
                    <motion.div whileHover={{ scale: savedThisSession ? 1 : 1.04 }} whileTap={{ scale: savedThisSession ? 1 : 0.96 }}>
                      <Button
                        onClick={handleSave}
                        disabled={savedThisSession || saveStoryMutation.isPending}
                        size="lg"
                        className={`rounded-full px-8 font-serif transition-all ${savedThisSession ? "bg-secondary/20 text-secondary border border-secondary/30 cursor-default" : "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"}`}
                        data-testid="button-save-story"
                      >
                        <BookMarked className="w-4 h-4 mr-2" />
                        {savedThisSession ? "Story Saved!" : saveStoryMutation.isPending ? "Saving..." : "Save Story"}
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                      <Button variant="outline" size="lg" onClick={handleReset} className="rounded-full px-8 font-serif border-white/15 hover:border-primary/40 hover:bg-primary/10 transition-colors" data-testid="button-reset">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Another Story
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── SAVED STORIES SECTION ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.6 }} className="mt-10">
          <button
            className="w-full flex items-center justify-between px-1 py-2 group"
            onClick={() => setShowSaved((s) => !s)}
            data-testid="button-toggle-saved-stories"
          >
            <div className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-primary group-hover:text-primary/80 transition-colors" />
              <span className="font-serif text-lg text-foreground/80 group-hover:text-foreground transition-colors">
                Saved Stories
              </span>
              {savedStories && savedStories.length > 0 && (
                <span className="text-xs font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {savedStories.length}
                </span>
              )}
            </div>
            {showSaved ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          <AnimatePresence>
            {showSaved && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-3">
                  {savedLoading && (
                    <p className="text-center text-muted-foreground text-sm py-6">Loading saved stories...</p>
                  )}
                  {!savedLoading && (!savedStories || savedStories.length === 0) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                      <p className="text-4xl mb-3">🌙</p>
                      <p className="text-muted-foreground text-sm">No saved stories yet.</p>
                      <p className="text-muted-foreground/60 text-xs mt-1">Generate a story and tap "Save Story" to keep it.</p>
                    </motion.div>
                  )}
                  <AnimatePresence>
                    {savedStories?.map((story) => (
                      <SavedStoryCard
                        key={story.id}
                        story={{ ...story, createdAt: String(story.createdAt) }}
                        onDelete={handleDelete}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
}
