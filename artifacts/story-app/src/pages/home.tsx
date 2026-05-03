import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Star, RefreshCw, BookMarked, Trash2,
  ChevronDown, ChevronUp, Sparkles,
  Play, Pause, Volume2, Loader2, VolumeX, Printer, BookOpen,
} from "lucide-react";
import {
  useGenerateStory,
  useGetSavedStories,
  useSaveStory,
  useDeleteSavedStory,
  getGetSavedStoriesQueryKey,
} from "@workspace/api-client-react";
import type { GenerateStoryRequestInterestsItem } from "@workspace/api-client-react";
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
import { useStreak } from "@/hooks/useStreak";
import { usePdfExport } from "@/hooks/usePdfExport";

const WORDS_PER_MINUTE = 180;

const STORY_LENGTHS = [
  { value: "5min", label: "5 min", sublabel: "Quick tale" },
  { value: "10min", label: "10 min", sublabel: "Classic story" },
  { value: "15min", label: "15 min", sublabel: "Long adventure" },
] as const;

const formSchema = z.object({
  childName: z.string().min(1, "Please enter a name").max(50),
  age: z.coerce.number().min(1, "Age must be at least 1").max(12, "Age must be 12 or under"),
  interests: z.array(z.string()).min(1, "Select at least one interest"),
  length: z.enum(["5min", "10min", "15min"]).default("5min"),
});

export default function Home() {
  const [savedThisSession, setSavedThisSession] = useState(false);
  const [generatedStory, setGeneratedStory] = useState<{
    title: string;
    story: string;
    emoji: string;
    childName: string;
  } | null>(null);
  const [pendingInterests, setPendingInterests] = useState<string>("");
  const [storyProgress, setStoryProgress] = useState(0);

  const queryClient = useQueryClient();
  const { recordActivity } = useStreak();
  const { download: downloadPdf, status: pdfStatus, reset: resetPdf } = usePdfExport();
  const generateStoryMutation = useGenerateStory();
  const saveStoryMutation = useSaveStory();
  const { data: savedStories } = useGetSavedStories({
    query: { queryKey: getGetSavedStoriesQueryKey() },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { childName: "", age: 5, interests: [], length: "5min" },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setSavedThisSession(false);
    setPendingInterests(values.interests.join(", "));
    generateStoryMutation.mutate(
      { data: { childName: values.childName, age: values.age, interests: values.interests as GenerateStoryRequestInterestsItem[], length: values.length } },
      {
        onSuccess: (result) => {
          setGeneratedStory({ title: result.title, story: result.story, emoji: result.emoji, childName: values.childName });
          recordActivity();
        },
      }
    );
  };

  const handleReset = () => {
    setGeneratedStory(null);
    setSavedThisSession(false);
    setPendingInterests("");
    resetPdf();
    form.reset({ childName: "", age: 5, interests: [], length: "5min" });
  };

  const paragraphs = generatedStory?.story.split(/\n\n+/).map((p) => p.trim()).filter(Boolean) ?? [];
  const estimatedReadMinutes = useMemo(() => {
    if (!generatedStory?.story) return 5;
    const words = generatedStory.story.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  }, [generatedStory?.story]);

  useEffect(() => {
    if (!generatedStory) {
      setStoryProgress(0);
      return;
    }

    const updateProgress = () => {
      const storyArea = document.getElementById("story-reading-area");
      if (!storyArea) return;
      const rect = storyArea.getBoundingClientRect();
      const total = rect.height + window.innerHeight;
      const scrolled = Math.min(total, Math.max(0, window.innerHeight - rect.top));
      setStoryProgress(Math.max(0, Math.min(100, (scrolled / total) * 100)));
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [generatedStory]);

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden flex flex-col items-center py-10 px-4 sm:px-8">
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        {generatedStory ? (
          <div className="sticky top-0 z-30 mb-4 rounded-full bg-white/10 backdrop-blur-md border border-white/10 p-2">
            <div className="flex items-center justify-between px-3 text-xs sm:text-sm text-white/80 font-medium">
              <span>{estimatedReadMinutes} min read</span>
              <span>{Math.round(storyProgress)}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${storyProgress}%` }} />
            </div>
          </div>
        ) : null}
        <Card className="shadow-2xl border-white/10 relative overflow-hidden backdrop-blur-sm">
          <div className="p-8 sm:p-12">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField control={form.control} name="childName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-serif text-foreground/90">Who is this story for?</FormLabel>
                      <FormControl><Input placeholder="Child's name" className="h-12 text-base rounded-2xl bg-muted/40 border-white/10 placeholder:text-muted-foreground/50" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="age" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-serif text-foreground/90">How old are they?</FormLabel>
                      <FormControl><Input type="number" placeholder="Age (1–12)" className="h-12 text-base rounded-2xl bg-muted/40 border-white/10 placeholder:text-muted-foreground/50" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="interests" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-serif text-foreground/90">What do they love?</FormLabel>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {(["dinosaurs", "space", "princess", "animals", "cars", "magic"] as const).map((id) => {
                        const isSelected = field.value.includes(id);
                        const label = id[0].toUpperCase() + id.slice(1);
                        const icon = { dinosaurs: "🦕", space: "🚀", princess: "👑", animals: "🐨", cars: "🏎️", magic: "✨" }[id];
                        return (
                          <motion.div key={id} whileTap={{ scale: 0.93 }} whileHover={{ scale: 1.05 }}>
                            <Badge variant={isSelected ? "default" : "outline"} className={`cursor-pointer px-4 py-2 text-sm rounded-full transition-all duration-300 select-none ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted/30 border-white/10 hover:bg-muted/50 text-foreground/80"}`} onClick={() => field.onChange(isSelected ? field.value.filter((v) => v !== id) : [...field.value, id])}>
                              <span className="mr-1.5 text-base">{icon}</span>{label}
                            </Badge>
                          </motion.div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="length" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-serif text-foreground/90">How long should the story be?</FormLabel>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {STORY_LENGTHS.map((opt) => {
                        const isSelected = field.value === opt.value;
                        return (
                          <motion.button key={opt.value} type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} onClick={() => field.onChange(opt.value)} className={`flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-2xl border text-center transition-all duration-200 select-none ${isSelected ? "border-primary/60 bg-primary/15" : "border-white/10 bg-muted/25 hover:border-white/20 hover:bg-muted/40"}`}>
                            <span className="text-sm font-semibold font-serif leading-none">{opt.label}</span>
                            <span className={`text-[11px] leading-none ${isSelected ? "text-primary/70" : "text-muted-foreground/60"}`}>{opt.sublabel}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="pt-2">
                  <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                    <Button type="submit" size="lg" className="btn-shimmer w-full h-14 text-lg font-serif rounded-2xl text-white border-0 shadow-[0_0_28px_hsl(262_72%_72%/0.4)]">
                      <Star className="w-5 h-5 mr-2 fill-white/70" />
                      Create Magic
                    </Button>
                  </motion.div>
                </div>
              </form>
            </Form>
          </div>
        </Card>
      </div>
      <div id="story-reading-area" className="w-full max-w-4xl mx-auto mt-8 story-reading-body">
        {generatedStory ? (
          <Card className="border-white/10 bg-card/90 backdrop-blur-sm">
            <div className="p-6 sm:p-10">
              <div className="mb-6 space-y-2">
                <div className="text-sm text-muted-foreground">{estimatedReadMinutes} min read</div>
                <h2 className="text-3xl sm:text-4xl font-serif leading-tight">{generatedStory.title}</h2>
                <p className="text-sm text-muted-foreground">{generatedStory.childName}</p>
              </div>
              <div className="space-y-6 text-[1.08rem] sm:text-[1.15rem] leading-8 sm:leading-9 font-story">
                {paragraphs.map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 12)}`} className="whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
