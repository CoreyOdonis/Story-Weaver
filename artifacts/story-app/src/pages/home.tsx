import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Star, RefreshCw, BookMarked, Loader2, Printer } from "lucide-react";
import {
  useGenerateStory,
  useGetSavedStories,
  useSaveStory,
  getGetSavedStoriesQueryKey,
} from "@workspace/api-client-react";
import type { GenerateStoryRequestInterestsItem, GenerateStoryRequestTone } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useReadAloud } from "@/hooks/useReadAloud";
import { useStreak } from "@/hooks/useStreak";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/hooks/usePreferences";
import { useChildren } from "@/hooks/useChildren";
import type { ChildProfile } from "@/hooks/useChildren";
import { ChildProfileBar } from "@/components/ChildProfileBar";
import { useSeries } from "@/hooks/useSeries";
import type { StorySeries } from "@/hooks/useSeries";
import { SeriesPicker } from "@/components/SeriesPicker";
import { ContinueStoryButton } from "@/components/ContinueStoryButton";
import { useMemory } from "@/hooks/useMemory";
import { StoryMemoryPanel } from "@/components/StoryMemoryPanel";
import { VoiceUploadSection } from "@/components/VoiceUploadSection";
import { auth } from "@/lib/firebase";
import { ContinueYesterdayButton } from "@/components/ContinueYesterdayButton";

const WORDS_PER_MINUTE = 180;
const LAST_ACTIVE_KEY = "dreamtime_last_active_story";

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

async function getToken(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken().catch(() => null);
}

function loadLastActive() {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      childId: number;
      childName: string;
      seriesId: number | null;
      seriesTitle: string | null;
      storyTitle: string;
    };
  } catch {
    return null;
  }
}

function saveLastActive(value: {
  childId: number;
  childName: string;
  seriesId: number | null;
  seriesTitle: string | null;
  storyTitle: string;
}) {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, JSON.stringify(value));
  } catch {}
}

export default function Home() {
  const [savedThisSession, setSavedThisSession] = useState(false);
  const [generatedStory, setGeneratedStory] = useState<{
    title: string;
    story: string;
    emoji: string;
    childName: string;
    summary?: string;
  } | null>(null);
  const [pendingInterests, setPendingInterests] = useState<string>("");
  const [storyProgress, setStoryProgress] = useState(0);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [selectedTone, setSelectedTone] = useState<GenerateStoryRequestTone | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<StorySeries | null>(null);
  const [continueLoading, setContinueLoading] = useState(false);
  const [lastActive, setLastActive] = useState<ReturnType<typeof loadLastActive>>(null);

  const { firebaseUser, profile, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { preferences, savePreferences } = usePreferences();
  const { children, createChild, updateChild, deleteChild } = useChildren();
  const { series, createSeries, updateSeries, deleteSeries } = useSeries(selectedChildId);
  const { primaryMemory, loading: memoryLoading, refresh: refreshMemory, clearMemory } = useMemory({
    childId: selectedChildId,
    seriesId: selectedSeriesId,
  });
  const [prefsApplied, setPrefsApplied] = useState(false);

  const queryClient = useQueryClient();
  const { recordActivity } = useStreak();
  const { download: downloadPdf, status: pdfStatus, reset: resetPdf } = usePdfExport();
  const generateStoryMutation = useGenerateStory();
  const saveStoryMutation = useSaveStory();
  const { data: savedStories } = useGetSavedStories({ query: { queryKey: getGetSavedStoriesQueryKey() } });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { childName: "", age: 5, interests: [], length: "5min" },
  });

  useEffect(() => {
    setLastActive(loadLastActive());
  }, []);

  useEffect(() => {
    if (!preferences || prefsApplied || selectedChildId) return;
    const patch: Partial<z.infer<typeof formSchema>> = {};
    if (preferences.childName) patch.childName = preferences.childName;
    if (preferences.age) patch.age = preferences.age;
    if (preferences.interests?.length) patch.interests = preferences.interests;
    if (preferences.storyLength) patch.length = preferences.storyLength;
    if (Object.keys(patch).length > 0) form.reset({ ...form.getValues(), ...patch });
    setPrefsApplied(true);
  }, [preferences, prefsApplied, form, selectedChildId]);

  useEffect(() => {
    if (!firebaseUser) {
      setPrefsApplied(false);
      setSelectedChildId(null);
      setSelectedChild(null);
      setSelectedTone(null);
      setSelectedSeriesId(null);
      setSelectedSeries(null);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (!selectedChildId || !selectedSeriesId || !selectedChild || !selectedSeries) return;
    saveLastActive({
      childId: selectedChildId,
      childName: selectedChild.name,
      seriesId: selectedSeriesId,
      seriesTitle: selectedSeries.title,
      storyTitle: selectedSeries.title,
    });
    setLastActive({
      childId: selectedChildId,
      childName: selectedChild.name,
      seriesId: selectedSeriesId,
      seriesTitle: selectedSeries.title,
      storyTitle: selectedSeries.title,
    });
  }, [selectedChildId, selectedChild, selectedSeriesId, selectedSeries]);

  const handleSelectChild = (child: ChildProfile | null) => {
    setSelectedChild(child);
    setSelectedSeriesId(null);
    setSelectedSeries(null);
    if (!child) {
      setSelectedChildId(null);
      setSelectedTone(null);
      return;
    }
    setSelectedChildId(child.id);
    setSelectedTone((child.tone as GenerateStoryRequestTone) ?? null);
    form.reset({
      childName: child.name,
      age: child.age ?? 5,
      interests: child.interests,
      length: child.defaultStoryLength ?? "5min",
    });
  };

  const handleSelectSeries = (s: StorySeries | null) => {
    setSelectedSeries(s);
    setSelectedSeriesId(s?.id ?? null);
  };

  const runContinue = async (targetChildId?: number, targetSeriesId?: number | null) => {
    const childId = targetChildId ?? selectedChildId;
    const seriesId = targetSeriesId ?? selectedSeriesId;
    if (!childId || !seriesId) return;
    const child = children.find((c) => c.id === childId) ?? selectedChild;
    const seriesItem = series.find((s) => s.id === seriesId) ?? selectedSeries;
    if (!child || !seriesItem) return;
    setSelectedChild(child);
    setSelectedSeries(seriesItem);
    setSelectedChildId(child.id);
    setSelectedSeriesId(seriesItem.id);
    setSelectedTone((child.tone as GenerateStoryRequestTone) ?? null);
    form.reset({ childName: child.name, age: child.age ?? 5, interests: child.interests, length: child.defaultStoryLength ?? "5min" });
    await handleContinueStory();
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!selectedChild) return;
    setSavedThisSession(false);
    setPendingInterests(selectedChild.interests.join(", "));
    generateStoryMutation.mutate(
      {
        data: {
          childName: selectedChild.name,
          age: selectedChild.age ?? values.age,
          interests: selectedChild.interests as GenerateStoryRequestInterestsItem[],
          storyLength: values.length,
          ...(selectedTone ? { tone: selectedTone } : {}),
          ...(selectedChildId ? { childId: selectedChildId } : {}),
          ...(selectedSeriesId ? { seriesId: selectedSeriesId } : {}),
        },
      },
      {
        onSuccess: (result) => {
          setGeneratedStory({
            title: result.title,
            story: result.story,
            emoji: result.emoji,
            childName: selectedChild.name,
            summary: result.summary,
          });
          recordActivity();
          void refreshMemory();
          saveLastActive({
            childId: selectedChild.id,
            childName: selectedChild.name,
            seriesId: selectedSeriesId,
            seriesTitle: selectedSeries?.title ?? null,
            storyTitle: result.title,
          });
          setLastActive({
            childId: selectedChild.id,
            childName: selectedChild.name,
            seriesId: selectedSeriesId,
            seriesTitle: selectedSeries?.title ?? null,
            storyTitle: result.title,
          });
          if (firebaseUser) {
            void savePreferences({
              childName: selectedChild.name,
              age: selectedChild.age ?? values.age,
              interests: selectedChild.interests,
              storyLength: values.length,
            });
          }
        },
      }
    );
  };

  const handleContinueStory = async () => {
    if (!selectedChild || !selectedSeries) return;
    setContinueLoading(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const BASE_URL = import.meta.env.BASE_URL ?? "/";
      const base = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;

      const response = await fetch(`${base}api/continue-story`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          childName: selectedChild.name,
          age: selectedChild.age ?? 5,
          interests: selectedChild.interests,
          storyLength: selectedChild.defaultStoryLength ?? "5min",
          tone: selectedTone ?? selectedChild.tone,
          seriesId: selectedSeries.id,
          childId: selectedChildId,
        }),
      });
      if (!response.ok) return;
      const result = (await response.json()) as { title: string; story: string; emoji: string; summary?: string };
      setGeneratedStory({ ...result, childName: selectedChild.name });
      setPendingInterests(selectedChild.interests.join(", "));
      recordActivity();
      void refreshMemory();
      saveLastActive({
        childId: selectedChild.id,
        childName: selectedChild.name,
        seriesId: selectedSeries.id,
        seriesTitle: selectedSeries.title,
        storyTitle: result.title,
      });
      setLastActive({
        childId: selectedChild.id,
        childName: selectedChild.name,
        seriesId: selectedSeries.id,
        seriesTitle: selectedSeries.title,
        storyTitle: result.title,
      });
    } finally {
      setContinueLoading(false);
    }
  };

  const handleReset = () => {
    setGeneratedStory(null);
    setSavedThisSession(false);
    setPendingInterests("");
    resetPdf();
    form.reset({ childName: "", age: 5, interests: [], length: "5min" });
    setSelectedChildId(null);
    setSelectedChild(null);
    setSelectedTone(null);
    setSelectedSeriesId(null);
    setSelectedSeries(null);
  };

  const paragraphs = generatedStory?.story.split(/\n\n+/).map((p) => p.trim()).filter(Boolean) ?? [];
  const estimatedReadMinutes = useMemo(() => {
    if (!generatedStory?.story) return 5;
    const words = generatedStory.story.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  }, [generatedStory?.story]);

  useEffect(() => {
    if (!generatedStory) { setStoryProgress(0); return; }
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
      <div className="relative z-10 w-full max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌙</span>
          <span className="font-serif font-bold text-lg text-foreground/90 hidden sm:block">Dreamtime Stories</span>
        </div>
        {authLoading ? null : firebaseUser ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground/80 hidden sm:block">{profile?.name ?? firebaseUser.displayName}</span>
            <Button variant="outline" size="sm" className="rounded-full border-white/10 text-xs h-8 px-3" onClick={signOut}>
              Sign out
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-sm h-9 px-4 gap-2" onClick={signInWithGoogle}>
            Continue with Google
          </Button>
        )}
      </div>

      {lastActive && firebaseUser && (
        <div className="relative z-10 w-full max-w-4xl mx-auto mb-4 flex justify-end">
          <ContinueYesterdayButton title={lastActive.storyTitle} onClick={() => void runContinue(lastActive.childId, lastActive.seriesId)} />
        </div>
      )}

      {firebaseUser && (
        <ChildProfileBar children={children} selectedChildId={selectedChildId} onSelect={handleSelectChild} onCreate={async (data) => { await createChild(data); }} onUpdate={async (id, data) => { await updateChild(id, data); }} onDelete={async (id) => { await deleteChild(id); }} />
      )}

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <Card className="shadow-2xl border-white/10 relative overflow-hidden backdrop-blur-sm">
          <div className="p-8 sm:p-12">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField control={form.control} name="childName" render={({ field }) => (<FormItem><FormLabel className="text-base font-serif text-foreground/90">Who is this story for?</FormLabel><FormControl><Input placeholder="Child's name" className="h-12 text-base rounded-2xl bg-muted/40 border-white/10 placeholder:text-muted-foreground/50" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="age" render={({ field }) => (<FormItem><FormLabel className="text-base font-serif text-foreground/90">How old are they?</FormLabel><FormControl><Input type="number" placeholder="Age (1–12)" className="h-12 text-base rounded-2xl bg-muted/40 border-white/10 placeholder:text-muted-foreground/50" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="interests" render={({ field }) => (<FormItem><FormLabel className="text-base font-serif text-foreground/90">What do they love?</FormLabel><div className="flex flex-wrap gap-3 mt-2">{(["dinosaurs", "space", "princess", "animals", "cars", "magic"] as const).map((id) => { const isSelected = field.value.includes(id); const label = id[0].toUpperCase() + id.slice(1); const icon = { dinosaurs: "🦕", space: "🚀", princess: "👑", animals: "🐨", cars: "🏎️", magic: "✨" }[id]; return (<motion.div key={id} whileTap={{ scale: 0.93 }} whileHover={{ scale: 1.05 }}><Badge variant={isSelected ? "default" : "outline"} className={`cursor-pointer px-4 py-2 text-sm rounded-full transition-all duration-300 select-none ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted/30 border-white/10 hover:bg-muted/50 text-foreground/80"}`} onClick={() => field.onChange(isSelected ? field.value.filter((v) => v !== id) : [...field.value, id])}><span className="mr-1.5 text-base">{icon}</span>{label}</Badge></motion.div>); })}</div><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="length" render={({ field }) => (<FormItem><FormLabel className="text-base font-serif text-foreground/90">How long should the story be?</FormLabel><div className="grid grid-cols-3 gap-3 mt-2">{STORY_LENGTHS.map((opt) => { const isSelected = field.value === opt.value; return (<motion.button key={opt.value} type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} onClick={() => field.onChange(opt.value)} className={`flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-2xl border text-center transition-all duration-200 select-none ${isSelected ? "border-primary/60 bg-primary/15" : "border-white/10 bg-muted/25 hover:border-white/20 hover:bg-muted/40"}`}><span className="text-sm font-semibold font-serif leading-none">{opt.label}</span><span className={`text-[11px] leading-none ${isSelected ? "text-primary/70" : "text-muted-foreground/60"}`}>{opt.sublabel}</span></motion.button>); })}</div><FormMessage /></FormItem>)} />
                {selectedTone && (<div className="flex items-center gap-2 text-sm text-muted-foreground"><span>Story tone:</span><Badge variant="outline" className="rounded-full border-white/10 text-xs capitalize">{{ calm: "🌙", exciting: "⚡", silly: "😄", adventurous: "🗺️", magical: "✨" }[selectedTone] ?? ""} {selectedTone}</Badge></div>)}
                {firebaseUser && (<div className="pt-2"><VoiceUploadSection /></div>)}
                {selectedChildId && firebaseUser && (<SeriesPicker childId={selectedChildId} series={series} selectedSeriesId={selectedSeriesId} onSelect={handleSelectSeries} onCreate={async (data) => { await createSeries(data); }} onUpdate={async (id, data) => { await updateSeries(id, data); }} onDelete={async (id) => { await deleteSeries(id); }} />)}
                {firebaseUser && selectedChildId && (<div className="pt-1"><StoryMemoryPanel memory={primaryMemory} loading={memoryLoading} onRefresh={() => void refreshMemory()} onClear={() => void clearMemory()} /></div>)}
                <div className="pt-2"><motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}><Button type="submit" size="lg" className="btn-shimmer w-full h-14 text-lg font-serif rounded-2xl text-white border-0 shadow-[0_0_28px_hsl(262_72%_72%/0.4)]" disabled={generateStoryMutation.isPending || !selectedChild}>{generateStoryMutation.isPending ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Weaving your story…</>) : (<><Star className="w-5 h-5 mr-2 fill-white/70" /> Create Magic</>)}</Button></motion.div></div>
                {selectedSeries && (<div className="flex items-center gap-3 pt-2"><ContinueStoryButton loading={continueLoading} disabled={!selectedSeries} onClick={() => void handleContinueStory()} /></div>)}
              </form>
            </Form>
          </div>
        </Card>
      </div>

      <div id="story-reading-area" className="w-full max-w-4xl mx-auto mt-8 story-reading-body">
        {generatedStory ? (<Card className="border-white/10 bg-card/90 backdrop-blur-sm"><div className="p-6 sm:p-10"><div className="mb-6 space-y-2"><div className="text-sm text-muted-foreground">{estimatedReadMinutes} min read</div><h2 className="text-3xl sm:text-4xl font-serif leading-tight">{generatedStory.title}</h2><p className="text-sm text-muted-foreground">{generatedStory.childName}</p></div><div className="space-y-6 text-[1.08rem] sm:text-[1.15rem] leading-8 sm:leading-9 font-story">{paragraphs.map((paragraph, index) => (<p key={`${index}-${paragraph.slice(0, 12)}`} className="whitespace-pre-wrap">{paragraph}</p>))}</div>{!savedThisSession && (<div className="mt-8 pt-6 border-t border-white/10"><Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 gap-2" disabled={saveStoryMutation.isPending || !selectedChildId} onClick={() => { if (!selectedChildId || !selectedChild) return; saveStoryMutation.mutate({ data: { childName: selectedChild.name, emoji: generatedStory.emoji, title: generatedStory.title, story: generatedStory.story, ...(generatedStory.summary ? { storySummary: generatedStory.summary } : {}), interests: pendingInterests, childId: selectedChildId, ...(selectedSeriesId ? { seriesId: selectedSeriesId } : {}) } }, { onSuccess: () => { setSavedThisSession(true); void queryClient.invalidateQueries({ queryKey: getGetSavedStoriesQueryKey() }); } }); }} >{saveStoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />} Save this story</Button>{savedThisSession && <span className="ml-3 text-sm text-muted-foreground">Saved ✓</span>}</div>)}{savedThisSession && (<div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3"><span className="text-sm text-muted-foreground">Story saved ✓</span><Button variant="outline" size="sm" className="rounded-xl border-white/10 hover:bg-white/5 gap-2 text-xs" onClick={handleReset}><RefreshCw className="w-3.5 h-3.5" /> New story</Button></div>)}{selectedSeries && (<div className="mt-4"><ContinueStoryButton loading={continueLoading} disabled={!selectedSeries} onClick={() => void handleContinueStory()} /></div>)}
          </div></Card>) : null}
      </div>
    </div>
  );
}
