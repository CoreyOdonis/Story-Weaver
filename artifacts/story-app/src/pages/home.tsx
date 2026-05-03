import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ChevronRight,
  Clock3,
  Flame,
  Heart,
  Headphones,
  Layers3,
  LayoutGrid,
  Sparkles,
  Stars,
  Users,
  Wand2,
  FileText,
  Printer,
  Mic,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";

const FLOATING_STARS = [
  { top: "10%", left: "12%", delay: 0, duration: 6 },
  { top: "18%", left: "78%", delay: 1.2, duration: 7 },
  { top: "58%", left: "14%", delay: 0.8, duration: 8 },
  { top: "72%", left: "82%", delay: 1.5, duration: 6.5 },
  { top: "36%", left: "50%", delay: 0.4, duration: 7.5 },
];

const steps = [
  {
    icon: Users,
    title: "Create Profile",
    text: "Add your child’s name, age, and interests in under a minute.",
  },
  {
    icon: Wand2,
    title: "Generate Story",
    text: "Choose 5, 10, or 15 minutes and let AI weave the magic.",
  },
  {
    icon: BookOpen,
    title: "Enjoy Together",
    text: "Read, listen, or print beautifully illustrated bedtime stories.",
  },
];

const features = [
  { icon: Sparkles, title: "Personalized Stories", text: "Your child’s name and interests turn every story into theirs." },
  { icon: Clock3, title: "Multiple Story Lengths", text: "Quick 5-minute wind-downs or longer 15-minute adventures." },
  { icon: Flame, title: "Daily Streaks", text: "Keep the bedtime habit going with gentle progress nudges." },
  { icon: Mic, title: "Voice Narration", text: "Use parent voice cloning for a familiar, comforting read-aloud." },
  { icon: ChevronRight, title: "Story Series", text: "Continue yesterday’s story with memory across nights." },
  { icon: LayoutGrid, title: "Multi-Child Profiles", text: "Manage every child’s preferences in one family-friendly place." },
  { icon: FileText, title: "Illustrated PDF Storybooks", text: "Save keepsake storybooks with polished illustrated pages." },
  { icon: Printer, title: "Printable Offline Stories", text: "Print bedtime stories for travel, trips, and screen-free nights." },
];

const testimonials = [
  { name: "Sarah, mom of 2", quote: "Bedtime finally feels calm and special instead of a struggle." },
  { name: "James, dad", quote: "My daughter asks for ‘one more DreamTales story’ every night." },
  { name: "Priya, parent", quote: "The voice feature made it feel so personal and comforting." },
];

export default function Home() {
  const { firebaseUser, loading, signInWithGoogle } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (firebaseUser) window.location.href = "/app";
  }, [firebaseUser, loading]);

  const handleStart = async () => {
    try {
      setRedirecting(true);
      setAuthError(null);
      await signInWithGoogle();
      window.location.href = "/app";
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not sign in right now.");
    } finally {
      setRedirecting(false);
    }
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden bg-[#08111f]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.35),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(56,189,248,0.18),_transparent_24%),linear-gradient(180deg,_#0a1020_0%,_#121b33_55%,_#1c1234_100%)]" />
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.16)_0,rgba(255,255,255,0)_2px),radial-gradient(circle_at_70%_28%,rgba(255,255,255,0.14)_0,rgba(255,255,255,0)_1.5px),radial-gradient(circle_at_35%_65%,rgba(255,255,255,0.12)_0,rgba(255,255,255,0)_1.5px),radial-gradient(circle_at_82%_72%,rgba(255,255,255,0.15)_0,rgba(255,255,255,0)_2px)]" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {FLOATING_STARS.map((star, index) => (
          <motion.div
            key={index}
            className="pointer-events-none absolute text-white/80"
            style={{ top: star.top, left: star.left }}
            animate={{ y: [0, -10, 0], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: star.duration, delay: star.delay, repeat: Infinity, ease: "easeInOut" }}
          >
            <Stars className="h-5 w-5" />
          </motion.div>
        ))}
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-white/10 p-2">
              <Heart className="h-4 w-4 text-pink-200" />
            </div>
            <div>
              <p className="text-sm font-semibold">DreamTales</p>
              <p className="text-xs text-white/70">AI bedtime stories kids love</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="hidden sm:inline-flex rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={handleStart}>
              Continue with Google
            </Button>
            <Button className="rounded-full bg-white text-slate-900 hover:bg-white/90" onClick={handleStart}>
              Start Your First Story
            </Button>
          </div>
        </header>

        <section className="grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div className="space-y-7">
            <Badge variant="outline" className="rounded-full border-white/15 bg-white/5 px-4 py-1 text-white/80">
              Loved by parents worldwide
            </Badge>
            <div className="space-y-5">
              <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Turn Bedtime Into a Magical Story Your Child Stars In
              </h1>
              <p className="max-w-xl text-lg leading-8 text-white/80 sm:text-xl">
                Personalized bedtime stories with your child’s name, voice, and imagination—ready in seconds.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-14 rounded-full bg-white px-6 text-base text-slate-900 hover:bg-white/90" onClick={handleStart}>
                {loading || redirecting ? <Spinner className="mr-2" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Start Your First Story
              </Button>
              <Button variant="outline" size="lg" className="h-14 rounded-full border-white/15 bg-white/5 px-6 text-base text-white hover:bg-white/10" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
                See How It Works
              </Button>
            </div>
            {authError ? <p className="text-sm text-red-200">{authError}</p> : null}
            <div className="flex items-center gap-4 text-sm text-white/70">
              <div className="flex items-center gap-1"><BadgeCheck className="h-4 w-4 text-emerald-300" /> Free to start</div>
              <div className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-sky-300" /> No setup stress</div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-6 top-8 h-24 w-24 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="absolute -right-6 bottom-10 h-24 w-24 rounded-full bg-fuchsia-400/20 blur-3xl" />
            <Card className="border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">Tonight’s story</p>
                    <h2 className="text-2xl font-semibold text-white">The Little Comet and Mia</h2>
                  </div>
                  <Badge className="rounded-full bg-emerald-400/20 text-emerald-100">10 min bedtime story</Badge>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
                    <div className="mb-3 flex items-center gap-2 text-sm text-white/80">
                      <Wand2 className="h-4 w-4 text-yellow-200" /> Personalized preview
                    </div>
                    <p className="text-sm leading-6 text-white/75">
                      Mia was feeling sleepy when a tiny comet asked for help finding the moonlit garden. Together they drifted through clouds, met a friendly fox, and made it home before the stars blinked goodnight.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-white/60">Streak</div>
                    <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
                      <Flame className="h-5 w-5 text-orange-300" /> 5-day streak
                    </div>
                    <button className="mt-4 inline-flex items-center gap-2 text-sm text-sky-200">
                      Continue Story <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="how-it-works" className="py-10 sm:py-16">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/55">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Three simple steps</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} className="border-white/10 bg-white/8 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-white/60">Step {index + 1}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-white/75">{step.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="py-10 sm:py-16">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/55">Features</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Everything parents need for calmer nights</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-white/10 bg-white/8 backdrop-blur-sm">
                  <CardContent className="p-5">
                    <Icon className="h-5 w-5 text-sky-200" />
                    <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/72">{feature.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="py-10 sm:py-16">
          <Card className="overflow-hidden border-white/10 bg-white/8 backdrop-blur-sm">
            <CardContent className="grid gap-8 p-8 lg:grid-cols-2 lg:items-center">
              <div className="space-y-4">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/55">For parents</p>
                <h2 className="text-3xl font-semibold text-white sm:text-4xl">Make Bedtime Something They Look Forward To</h2>
                <p className="text-lg leading-8 text-white/78">
                  Less screen stress. More connection. Personalized magic that helps bedtime feel warm, familiar, and special every single night.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Less stress", "A smoother nighttime routine."],
                  ["More connection", "Stories they can see themselves in."],
                  ["Personalized magic", "Each night feels one-of-a-kind."],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="font-semibold text-white">{title}</p>
                    <p className="mt-2 text-sm text-white/70">{text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="py-10 sm:py-16">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/55">Preview</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">A quick look at the app</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-white/10 bg-white/8 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Badge className="rounded-full bg-sky-400/20 text-sky-100">10 min bedtime story</Badge>
                  <Badge variant="outline" className="rounded-full border-white/15 text-white/70">Illustrated</Badge>
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white">The Moon Picnic for Ava</h3>
                <p className="mt-3 max-w-2xl text-white/75 leading-7">
                  Ava packed tiny moon sandwiches, followed a silver rabbit, and discovered a glowing picnic under the stars.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button className="rounded-full bg-white text-slate-900 hover:bg-white/90">Continue Story</Button>
                  <Button variant="outline" className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10">Play in Your Voice</Button>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-5">
              <Card className="border-white/10 bg-white/8 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-400/15 p-3"><Flame className="h-5 w-5 text-emerald-200" /></div>
                    <div>
                      <p className="text-sm text-white/60">Streak</p>
                      <p className="font-semibold text-white">5-day bedtime habit</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/8 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-pink-400/15 p-3"><Headphones className="h-5 w-5 text-pink-200" /></div>
                    <div>
                      <p className="text-sm text-white/60">Voice narration</p>
                      <p className="font-semibold text-white">Parent voice cloning</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/8 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-violet-400/15 p-3"><Layers3 className="h-5 w-5 text-violet-200" /></div>
                    <div>
                      <p className="text-sm text-white/60">Series mode</p>
                      <p className="font-semibold text-white">Continue yesterday’s story</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-16">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/55">Social proof</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Trusted by busy parents</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.name} className="border-white/10 bg-white/8 backdrop-blur-sm">
                <CardContent className="p-6">
                  <p className="text-white/80">“{item.quote}”</p>
                  <p className="mt-4 text-sm font-medium text-white/60">{item.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <Card className="border-white/10 bg-gradient-to-r from-white/12 to-white/6 backdrop-blur-sm">
            <CardContent className="flex flex-col items-start gap-5 p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/55">Final CTA</p>
                <h2 className="text-3xl font-semibold text-white sm:text-4xl">Start Your Child’s First Magical Story Tonight</h2>
                <p className="text-white/75">Free to start. No setup stress. One click gets you to your dashboard and your first story.</p>
              </div>
              <Button size="lg" className="h-14 rounded-full bg-white px-6 text-base text-slate-900 hover:bg-white/90" onClick={handleStart}>
                Continue with Google
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
