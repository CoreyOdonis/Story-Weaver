import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, ChevronUp, Users, MapPin, Sparkles, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StoryMemory } from "@/hooks/useMemory";

interface Props {
  memory: StoryMemory | null;
  loading?: boolean;
  onClear?: () => void;
  onRefresh?: () => void;
}

export function StoryMemoryPanel({ memory, loading, onClear, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasContent =
    memory &&
    (memory.mainCharacters.length > 0 ||
      memory.sideCharacters.length > 0 ||
      memory.locations.length > 0 ||
      memory.themes.length > 0 ||
      memory.tonePreferences.length > 0);

  if (!hasContent && !loading) return null;

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Brain className="w-3.5 h-3.5" />
        <span className="font-medium">Story memory</span>
        {loading && <span className="text-[10px] opacity-60">updating…</span>}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {expanded && memory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              {memory.mainCharacters.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                    <Users className="w-3 h-3" /> Main characters
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {memory.mainCharacters.map((c) => (
                      <div key={c.name} className="group relative">
                        <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 text-xs px-2.5 py-0.5 cursor-default">
                          {c.name}
                        </Badge>
                        {c.description && (
                          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10 bg-card border border-white/10 rounded-lg px-2 py-1 text-[10px] text-muted-foreground whitespace-nowrap shadow-lg">
                            {c.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {memory.sideCharacters.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                    <Users className="w-3 h-3 opacity-60" /> Side characters
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {memory.sideCharacters.map((c) => (
                      <Badge key={c.name} variant="outline" className="rounded-full border-white/10 text-xs px-2.5 py-0.5 opacity-70 cursor-default">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {memory.locations.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                    <MapPin className="w-3 h-3" /> Settings
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {memory.locations.map((l) => (
                      <div key={l.name} className="group relative">
                        <Badge variant="outline" className="rounded-full border-white/10 bg-primary/5 text-xs px-2.5 py-0.5 cursor-default">
                          {l.name}
                        </Badge>
                        {l.description && (
                          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10 bg-card border border-white/10 rounded-lg px-2 py-1 text-[10px] text-muted-foreground whitespace-nowrap shadow-lg">
                            {l.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {memory.themes.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                    <Sparkles className="w-3 h-3" /> Themes
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {memory.themes.map((t) => (
                      <Badge key={t} variant="outline" className="rounded-full border-white/10 text-xs px-2.5 py-0.5 cursor-default capitalize">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {memory.tonePreferences.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                    Tone
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {memory.tonePreferences.map((t) => (
                      <Badge key={t} variant="outline" className="rounded-full border-white/10 text-[10px] px-2 py-0.5 cursor-default opacity-70 capitalize">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {onRefresh && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                    onClick={onRefresh}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                )}
                {onClear && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive"
                    onClick={onClear}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear memory
                  </Button>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground/50">
                Updated {new Date(memory.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
