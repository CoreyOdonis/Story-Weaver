import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Upload, Check, Loader2, Trash2,
  Play, Pause, ChevronDown, ChevronUp, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceProfile } from "@/hooks/useVoiceProfile";
import { useCustomTts } from "@/hooks/useCustomTts";

function formatTime(secs: number) {
  if (!isFinite(secs) || isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const ACCEPTED_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/mp4",
  "audio/x-m4a", "audio/ogg", "audio/webm", "audio/aac",
];
const ACCEPT_ATTR = ".mp3,.wav,.m4a,.ogg,.webm,.aac,audio/*";

/* ── My Voice Player ── */
export function MyVoicePlayer({
  storyText,
  voiceId,
  voiceName,
}: {
  storyText: string;
  voiceId: string;
  voiceName: string;
}) {
  const { state, currentTime, duration, progress, toggle, stop, errorMessage } =
    useCustomTts(storyText, voiceId);

  const isLoading = state === "loading";
  const isPlaying = state === "playing";
  const isError   = state === "error";
  const isActive  = state === "playing" || state === "paused";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.4 }}
      className="mt-4 mb-2"
    >
      <div className="rounded-2xl border border-secondary/20 bg-secondary/5 backdrop-blur-sm px-5 py-4">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: isLoading ? 1 : 1.08 }}
            whileTap={{ scale: isLoading ? 1 : 0.93 }}
            onClick={toggle}
            disabled={isLoading}
            className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg
              ${isError
                ? "bg-destructive/20 border border-destructive/40 text-destructive"
                : isPlaying
                  ? "bg-secondary text-secondary-foreground shadow-[0_0_18px_hsl(var(--secondary)/0.45)]"
                  : "bg-secondary/20 border border-secondary/30 text-secondary hover:bg-secondary/30"
              }`}
            aria-label={isPlaying ? "Pause" : "Play in my voice"}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isError ? (
              <MicOff className="w-5 h-5" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </motion.button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Mic className="w-3.5 h-3.5 text-secondary shrink-0" />
              <span className="text-xs font-medium text-secondary truncate">
                {isLoading
                  ? "Generating in your voice…"
                  : isError
                    ? errorMessage ?? "Error"
                    : `${voiceName}`}
              </span>

              {isActive && (
                <div className="flex gap-[3px] items-end ml-auto shrink-0">
                  {[0.6, 1, 0.75, 0.9, 0.5].map((h, i) => (
                    <motion.span
                      key={i}
                      className="w-[3px] rounded-full bg-secondary"
                      animate={isPlaying
                        ? { height: [`${h * 10}px`, `${h * 18}px`, `${h * 8}px`] }
                        : { height: "6px" }}
                      transition={{
                        duration: 0.5 + i * 0.08,
                        repeat: Infinity,
                        repeatType: "mirror",
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 h-1.5 bg-secondary/15 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-secondary rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                {isActive ? `${formatTime(currentTime)} / ${formatTime(duration)}` : ""}
              </span>
              {isActive && (
                <button
                  onClick={stop}
                  className="text-muted-foreground hover:text-secondary transition-colors text-[10px] shrink-0"
                  aria-label="Stop"
                >
                  ■
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Voice Upload Section ── */
export function VoiceUploadSection() {
  const [expanded, setExpanded] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [voiceNameInput, setVoiceNameInput] = useState("My Voice");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { status, voiceName, uploadError, upload, remove, isDeleting } =
    useVoiceProfile();

  const handleFile = useCallback(
    (file: File) => {
      if (!consentGiven) return;
      const valid = ACCEPTED_TYPES.some(
        (t) => file.type === t || file.type.startsWith("audio/")
      );
      if (!valid) return;
      upload(file, voiceNameInput.trim() || "My Voice");
    },
    [consentGiven, upload, voiceNameInput]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer?.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const isUploading = status === "uploading";
  const isActive    = status === "active";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto mt-5"
    >
      <button
        className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors text-left"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <div className={`p-1.5 rounded-full transition-colors ${isActive ? "bg-secondary/20" : "bg-white/5"}`}>
          <Mic className={`w-4 h-4 ${isActive ? "text-secondary" : "text-muted-foreground"}`} />
        </div>
        <span className="flex-1 text-sm font-medium text-muted-foreground">
          {isActive ? `My Voice: ${voiceName}` : "Upload Your Voice"}
        </span>
        {isActive && (
          <span className="text-[10px] bg-secondary/15 text-secondary px-2 py-0.5 rounded-full font-medium">
            Active
          </span>
        )}
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
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
            <div className="mt-2 rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-5 space-y-5">

              {/* Active voice state */}
              {isActive ? (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/10 border border-secondary/20">
                  <div className="p-2 rounded-full bg-secondary/20">
                    <Check className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-secondary">{voiceName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Voice model ready — use "Play in My Voice" after generating a story.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={remove}
                    disabled={isDeleting}
                    className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-full"
                    aria-label="Remove voice"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  {/* Consent block */}
                  <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                      <p className="text-xs font-semibold text-secondary tracking-wide uppercase">
                        Voice Privacy &amp; Consent
                      </p>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1.5 pl-1">
                      <li>• Your voice sample is sent to <strong className="text-foreground/70">ElevenLabs</strong> to create a personal AI narration voice.</li>
                      <li>• It is used <strong className="text-foreground/70">only</strong> to read stories aloud in this app.</li>
                      <li>• You can permanently delete your voice model at any time with the Remove button.</li>
                      <li>• Your voice is stored under an anonymous ID — never linked to your name or email.</li>
                    </ul>
                    <a
                      href="https://elevenlabs.io/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs text-secondary/70 hover:text-secondary underline underline-offset-2 transition-colors"
                    >
                      ElevenLabs Privacy Policy ↗
                    </a>

                    <label className="flex items-start gap-2.5 cursor-pointer mt-2 pt-2 border-t border-white/8">
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors
                          ${consentGiven ? "bg-secondary border-secondary" : "border-white/30 bg-white/5"}`}
                        onClick={() => setConsentGiven((v) => !v)}
                      >
                        {consentGiven && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span
                        className="text-xs text-muted-foreground leading-snug select-none"
                        onClick={() => setConsentGiven((v) => !v)}
                      >
                        I understand and consent to my voice sample being processed by ElevenLabs to create a narration voice.
                      </span>
                    </label>
                  </div>

                  {/* Voice name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Voice name (optional)
                    </label>
                    <input
                      type="text"
                      value={voiceNameInput}
                      onChange={(e) => setVoiceNameInput(e.target.value)}
                      maxLength={40}
                      placeholder="e.g. Mum, Dad, Grandpa…"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-secondary/40 transition-colors"
                    />
                  </div>

                  {/* Drop zone */}
                  <div
                    className={`relative rounded-xl border-2 border-dashed transition-all p-6 flex flex-col items-center gap-3 text-center
                      ${!consentGiven ? "opacity-40 cursor-not-allowed border-white/10" : isDragOver ? "border-secondary/60 bg-secondary/10 cursor-copy" : "border-white/15 hover:border-white/25 hover:bg-white/3 cursor-pointer"}`}
                    onDragOver={(e) => { e.preventDefault(); if (consentGiven) setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={consentGiven ? handleDrop : undefined}
                    onClick={() => consentGiven && fileInputRef.current?.click()}
                    aria-disabled={!consentGiven}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPT_ATTR}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                        e.target.value = "";
                      }}
                      disabled={!consentGiven}
                    />

                    {isUploading ? (
                      <>
                        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
                        <div>
                          <p className="text-sm font-medium text-secondary">Creating your voice…</p>
                          <p className="text-xs text-muted-foreground mt-1">This may take up to a minute</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3 rounded-full bg-white/5">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground/80">
                            Drop your voice sample here
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            or click to browse
                          </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground/60">
                          MP3 · WAV · M4A · OGG · WebM &nbsp;•&nbsp; 30–60 seconds recommended &nbsp;•&nbsp; Max 25 MB
                        </p>
                      </>
                    )}
                  </div>

                  {/* Error */}
                  {uploadError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                    >
                      {uploadError}
                    </motion.p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
