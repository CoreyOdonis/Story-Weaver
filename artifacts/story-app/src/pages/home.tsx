import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Moon, Star, RefreshCw } from "lucide-react";
import { useGenerateStory } from "@workspace/api-client-react";
import { GenerateStoryRequestInterestsItem } from "@workspace/api-client-react/src/generated/api.schemas";

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

/* ── Decorative star positions (fixed so they don't re-render) ── */
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

/* ── Loading dots ── */
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

/* ── Orbiting moon animation (shown while loading) ── */
function LoadingOrbit() {
  return (
    <div className="flex flex-col items-center gap-6 py-8" data-testid="loading-orbit">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <span
            className="absolute text-secondary text-lg"
            style={{ top: 0, left: "50%", transform: "translateX(-50%)" }}
          >
            ⭐
          </span>
        </motion.div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <span
            className="absolute text-base"
            style={{ bottom: 0, left: "50%", transform: "translateX(-50%)" }}
          >
            ✨
          </span>
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
        <div className="flex justify-center">
          <LoadingDots />
        </div>
        <p className="text-muted-foreground text-sm">Sprinkling in a little magic</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [generatedStory, setGeneratedStory] = useState<{
    title: string;
    story: string;
    emoji: string;
  } | null>(null);

  const generateStoryMutation = useGenerateStory();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { childName: "", age: 5, interests: [] },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    generateStoryMutation.mutate(
      {
        data: {
          childName: values.childName,
          age: values.age,
          interests: values.interests as GenerateStoryRequestInterestsItem[],
        },
      },
      {
        onSuccess: (result) => {
          setGeneratedStory({ title: result.title, story: result.story, emoji: result.emoji });
        },
      }
    );
  };

  const handleReset = () => {
    setGeneratedStory(null);
    generateStoryMutation.reset();
    form.reset();
  };

  /* Split story into paragraphs for nicer rendering */
  const paragraphs = generatedStory?.story
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean) ?? [];

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8">

      {/* ── Night-sky stars ── */}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="star-twinkle pointer-events-none absolute select-none"
          style={{
            left: s.x,
            top: s.y,
            fontSize: s.size,
            color: "hsl(43 95% 68%)",
            ["--tw-duration" as string]: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
          aria-hidden="true"
        >
          ★
        </span>
      ))}

      {/* ── Ambient glow blobs ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="w-full max-w-2xl z-10">

        {/* ── Header ── */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="flex items-center justify-center gap-3 mb-2"
          >
            <Moon
              className="w-9 h-9 text-secondary moon-float fill-secondary/20"
              data-testid="icon-moon"
            />
            <h1
              className="text-4xl sm:text-5xl font-serif text-primary drop-shadow-[0_0_24px_hsl(262_72%_72%/0.5)]"
              data-testid="text-app-title"
            >
              Dreamtime Stories
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-muted-foreground text-lg"
          >
            Magical bedtime tales, created just for you.
          </motion.p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── FORM ── */}
          {!generatedStory && (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-6 sm:p-8 shadow-2xl border-white/10 relative overflow-hidden backdrop-blur-sm">
                <div className="absolute -top-20 -right-20 w-56 h-56 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

                {/* Show orbit loader inline when pending */}
                <AnimatePresence mode="wait">
                  {generateStoryMutation.isPending ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <LoadingOrbit />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="form-fields"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 relative z-10">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="childName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-serif text-foreground/90">
                                    Who is this story for?
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Child's name"
                                      className="h-12 text-base rounded-2xl bg-muted/40 border-white/10 placeholder:text-muted-foreground/50 focus:ring-primary/50"
                                      {...field}
                                      data-testid="input-child-name"
                                    />
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
                                  <FormLabel className="text-base font-serif text-foreground/90">
                                    How old are they?
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Age (1–12)"
                                      className="h-12 text-base rounded-2xl bg-muted/40 border-white/10 placeholder:text-muted-foreground/50 focus:ring-primary/50"
                                      {...field}
                                      data-testid="input-child-age"
                                    />
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
                                <FormLabel className="text-base font-serif text-foreground/90">
                                  What do they love?
                                </FormLabel>
                                <div className="flex flex-wrap gap-3 mt-2" data-testid="container-interests">
                                  {INTEREST_OPTIONS.map((interest) => {
                                    const isSelected = field.value.includes(interest.id);
                                    return (
                                      <motion.div
                                        key={interest.id}
                                        whileTap={{ scale: 0.93 }}
                                        whileHover={{ scale: 1.05 }}
                                      >
                                        <Badge
                                          variant={isSelected ? "default" : "outline"}
                                          className={`
                                            cursor-pointer px-4 py-2 text-sm rounded-full transition-all duration-300 select-none
                                            ${isSelected
                                              ? "bg-primary text-primary-foreground shadow-[0_0_14px_hsl(262_72%_72%/0.5)] border-primary/50"
                                              : "bg-muted/30 border-white/10 hover:bg-muted/50 text-foreground/80"}
                                          `}
                                          onClick={() => {
                                            if (isSelected) {
                                              field.onChange(field.value.filter((id) => id !== interest.id));
                                            } else {
                                              field.onChange([...field.value, interest.id]);
                                            }
                                          }}
                                          data-testid={`badge-interest-${interest.id}`}
                                        >
                                          <span className="mr-1.5 text-base">{interest.icon}</span>
                                          {interest.label}
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
                            <motion.div
                              whileHover={{ scale: 1.02, y: -1 }}
                              whileTap={{ scale: 0.97 }}
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            >
                              <Button
                                type="submit"
                                size="lg"
                                className="btn-shimmer w-full h-14 text-lg font-serif rounded-2xl text-white border-0 shadow-[0_0_28px_hsl(262_72%_72%/0.4)]"
                                data-testid="button-generate-story"
                              >
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
            <motion.div
              key="story"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <Card className="shadow-2xl border-white/10 relative overflow-hidden backdrop-blur-sm">
                {/* Gradient top bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-secondary opacity-90" />

                <div className="p-8 sm:p-12">
                  {/* Emoji + title */}
                  <div className="text-center mb-10">
                    <motion.div
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", bounce: 0.45, delay: 0.2 }}
                      className="text-8xl mb-5 leading-none"
                      data-testid="text-story-emoji"
                    >
                      {generatedStory.emoji}
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="text-2xl sm:text-3xl font-serif text-primary leading-snug"
                      data-testid="text-story-title"
                    >
                      {generatedStory.title}
                    </motion.h2>

                    {/* Small star divider */}
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ delay: 0.55, duration: 0.5 }}
                      className="flex items-center justify-center gap-3 mt-5"
                    >
                      <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50" />
                      <Sparkles className="w-4 h-4 text-secondary" />
                      <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50" />
                    </motion.div>
                  </div>

                  {/* Story body — paragraphs */}
                  <div className="space-y-5 mb-10" data-testid="text-story-content">
                    {paragraphs.map((para, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.12, duration: 0.6 }}
                        className="font-story text-lg sm:text-xl leading-[1.85] text-foreground/85 tracking-wide"
                      >
                        {para}
                      </motion.p>
                    ))}
                  </div>

                  {/* Footer */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                    className="flex justify-center pt-6 border-t border-white/10"
                  >
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleReset}
                        className="rounded-full px-8 font-serif border-white/15 hover:border-primary/40 hover:bg-primary/10 transition-colors"
                        data-testid="button-reset"
                      >
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
      </div>
    </div>
  );
}
