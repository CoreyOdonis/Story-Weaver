import React, { useState } from "react";
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

// Define the interest options as per instructions
const INTEREST_OPTIONS: { id: GenerateStoryRequestInterestsItem; label: string; icon: string }[] = [
  { id: "dinosaurs", label: "Dinosaurs", icon: "🦕" },
  { id: "space", label: "Space", icon: "🚀" },
  { id: "princess", label: "Princess", icon: "👑" },
  { id: "animals", label: "Animals", icon: "🐨" },
  { id: "cars", label: "Cars", icon: "🏎️" },
  { id: "magic", label: "Magic", icon: "✨" },
];

const formSchema = z.object({
  childName: z.string().min(1, "Please enter a name").max(50),
  age: z.coerce.number().min(1, "Age must be at least 1").max(12, "Age must be 12 or under"),
  interests: z.array(z.string()).min(1, "Select at least one interest"),
});

export default function Home() {
  const [generatedStory, setGeneratedStory] = useState<{
    title: string;
    story: string;
    emoji: string;
  } | null>(null);

  const generateStoryMutation = useGenerateStory();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      childName: "",
      age: 5,
      interests: [],
    },
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
          setGeneratedStory({
            title: result.title,
            story: result.story,
            emoji: result.emoji,
          });
        },
      }
    );
  };

  const handleReset = () => {
    setGeneratedStory(null);
    form.reset();
  };

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Decorative stars */}
      <div className="absolute top-10 left-10 text-secondary animate-pulse opacity-70"><Star className="w-6 h-6 fill-current" /></div>
      <div className="absolute top-20 right-20 text-secondary animate-pulse opacity-50" style={{ animationDelay: '1s' }}><Star className="w-4 h-4 fill-current" /></div>
      <div className="absolute bottom-20 left-1/4 text-secondary animate-pulse opacity-60" style={{ animationDelay: '2s' }}><Star className="w-5 h-5 fill-current" /></div>
      <div className="absolute top-1/4 left-1/3 text-secondary animate-pulse opacity-40" style={{ animationDelay: '1.5s' }}><Star className="w-3 h-3 fill-current" /></div>
      
      <div className="w-full max-w-2xl z-10">
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex items-center justify-center gap-3 mb-2"
          >
            <Moon className="w-8 h-8 text-primary" data-testid="icon-moon" />
            <h1 className="text-4xl sm:text-5xl font-serif text-primary" data-testid="text-app-title">
              Dreamtime Stories
            </h1>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-muted-foreground text-lg"
          >
            Magical bedtime tales, created just for you.
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {!generatedStory ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-6 sm:p-8 shadow-xl bg-card/80 backdrop-blur-sm border-white/40 dark:border-white/10 relative overflow-hidden">
                {/* Subtle magical glow inside card */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="childName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-serif">Who is this story for?</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Child's name" 
                                className="bg-background/50 h-12 text-lg rounded-2xl" 
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
                            <FormLabel className="text-base font-serif">How old are they?</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Age (1-12)" 
                                className="bg-background/50 h-12 text-lg rounded-2xl" 
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
                          <FormLabel className="text-base font-serif">What do they love?</FormLabel>
                          <div className="flex flex-wrap gap-3 mt-2" data-testid="container-interests">
                            {INTEREST_OPTIONS.map((interest) => {
                              const isSelected = field.value.includes(interest.id);
                              return (
                                <Badge
                                  key={interest.id}
                                  variant={isSelected ? "default" : "outline"}
                                  className={`
                                    cursor-pointer px-4 py-2 text-sm sm:text-base rounded-full transition-all duration-300
                                    ${isSelected ? 'shadow-md scale-105 bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background/50 hover:bg-accent/30'}
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
                                  <span className="mr-2 text-lg">{interest.icon}</span>
                                  {interest.label}
                                </Badge>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        size="lg" 
                        className="w-full h-14 text-lg font-serif rounded-2xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg transition-all"
                        disabled={generateStoryMutation.isPending}
                        data-testid="button-generate-story"
                      >
                        {generateStoryMutation.isPending ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2"
                          >
                            <Sparkles className="w-5 h-5 animate-spin" />
                            Dreaming up a story...
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2"
                          >
                            <Sparkles className="w-5 h-5" />
                            Create Magic
                          </motion.div>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="story"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <Card className="p-8 sm:p-12 shadow-2xl bg-card/95 backdrop-blur-md border-white/40 dark:border-white/10 relative overflow-hidden">
                {/* Storybook decorative elements */}
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-primary via-accent to-secondary opacity-80" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="text-center mb-8 relative z-10">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5, delay: 0.3 }}
                    className="text-7xl mb-4"
                    data-testid="text-story-emoji"
                  >
                    {generatedStory.emoji}
                  </motion.div>
                  <h2 className="text-3xl sm:text-4xl font-serif text-foreground font-bold leading-tight" data-testid="text-story-title">
                    {generatedStory.title}
                  </h2>
                </div>

                <div className="prose prose-lg dark:prose-invert max-w-none mb-10 relative z-10">
                  <p className="text-lg sm:text-xl leading-relaxed text-muted-foreground whitespace-pre-wrap font-sans" data-testid="text-story-content">
                    {generatedStory.story}
                  </p>
                </div>

                <div className="flex justify-center relative z-10 pt-6 border-t border-border/50">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={handleReset}
                    className="rounded-full px-8 font-serif"
                    data-testid="button-reset"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate Another Story
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
