import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Check, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ChildProfile, CreateChildInput } from "@/hooks/useChildren";

const INTERESTS = ["dinosaurs", "space", "princess", "animals", "cars", "magic"] as const;
const INTEREST_ICONS: Record<string, string> = {
  dinosaurs: "🦕", space: "🚀", princess: "👑", animals: "🐨", cars: "🏎️", magic: "✨",
};
const LENGTHS = [
  { value: "5min", label: "5 min" },
  { value: "10min", label: "10 min" },
  { value: "15min", label: "15 min" },
] as const;
const TONES = [
  { value: "calm", label: "Calm", icon: "🌙" },
  { value: "exciting", label: "Exciting", icon: "⚡" },
  { value: "silly", label: "Silly", icon: "😄" },
  { value: "adventurous", label: "Adventurous", icon: "🗺️" },
  { value: "magical", label: "Magical", icon: "✨" },
] as const;

interface ChildFormState {
  name: string;
  age: string;
  interests: string[];
  defaultStoryLength: "5min" | "10min" | "15min" | null;
  tone: "calm" | "exciting" | "silly" | "adventurous" | "magical" | null;
}

const emptyForm = (): ChildFormState => ({
  name: "",
  age: "",
  interests: [],
  defaultStoryLength: null,
  tone: "calm",
});

function formToInput(form: ChildFormState): CreateChildInput {
  return {
    name: form.name.trim(),
    age: form.age ? Number(form.age) : null,
    interests: form.interests,
    defaultStoryLength: form.defaultStoryLength,
    tone: form.tone,
  };
}

interface Props {
  children: ChildProfile[];
  selectedChildId: number | null;
  onSelect: (child: ChildProfile | null) => void;
  onCreate: (data: CreateChildInput) => Promise<void>;
  onUpdate: (id: number, data: CreateChildInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function ChildProfileBar({ children, selectedChildId, onSelect, onCreate, onUpdate, onDelete }: Props) {
  const [dialogMode, setDialogMode] = useState<"none" | "add" | "edit">("none");
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null);
  const [form, setForm] = useState<ChildFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const openAdd = () => {
    setForm(emptyForm());
    setEditingChild(null);
    setDialogMode("add");
  };

  const openEdit = (child: ChildProfile) => {
    setForm({
      name: child.name,
      age: child.age != null ? String(child.age) : "",
      interests: child.interests ?? [],
      defaultStoryLength: child.defaultStoryLength,
      tone: child.tone,
    });
    setEditingChild(child);
    setDialogMode("edit");
  };

  const closeDialog = () => {
    setDialogMode("none");
    setEditingChild(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (dialogMode === "add") {
        await onCreate(formToInput(form));
      } else if (dialogMode === "edit" && editingChild) {
        await onUpdate(editingChild.id, formToInput(form));
      }
      closeDialog();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await onDelete(id);
    if (selectedChildId === id) onSelect(null);
    setConfirmDeleteId(null);
  };

  const toggleInterest = (id: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(id) ? f.interests.filter((v) => v !== id) : [...f.interests, id],
    }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium shrink-0 flex items-center gap-1">
          <UserRound className="w-3.5 h-3.5" /> Story for:
        </span>

        <AnimatePresence initial={false}>
          {children.map((child) => {
            const isSelected = selectedChildId === child.id;
            return (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="flex items-center gap-1 group"
              >
                <button
                  type="button"
                  onClick={() => onSelect(isSelected ? null : child)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 border-white/10 hover:bg-muted/50 text-foreground/80"
                  }`}
                >
                  <span>{child.tone ? TONES.find((t) => t.value === child.tone)?.icon ?? "👶" : "👶"}</span>
                  <span>{child.name}</span>
                  {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                </button>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openEdit(child)}
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit profile"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  {confirmDeleteId === child.id ? (
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => void handleDelete(child.id)}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-destructive/20 hover:bg-destructive/40 text-destructive transition-colors"
                        title="Confirm delete"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 text-muted-foreground transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(child.id)}
                      className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border border-dashed border-white/20 text-muted-foreground hover:text-foreground hover:border-white/40 transition-all duration-200"
        >
          <Plus className="w-3 h-3" />
          {children.length === 0 ? "Add child profile" : "Add"}
        </button>
      </div>

      <Dialog open={dialogMode !== "none"} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {dialogMode === "add" ? "New child profile" : `Edit ${editingChild?.name ?? "profile"}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  placeholder="Child's name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium">Age</label>
                <Input
                  type="number"
                  placeholder="1–12"
                  min={1}
                  max={12}
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Interests</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((id) => {
                  const sel = form.interests.includes(id);
                  return (
                    <Badge
                      key={id}
                      variant={sel ? "default" : "outline"}
                      className={`cursor-pointer px-3 py-1 rounded-full text-xs ${sel ? "bg-primary text-primary-foreground" : "bg-muted/30 border-white/10 hover:bg-muted/50"}`}
                      onClick={() => toggleInterest(id)}
                    >
                      <span className="mr-1">{INTEREST_ICONS[id]}</span>
                      {id[0].toUpperCase() + id.slice(1)}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Default story length</label>
              <div className="flex gap-2">
                {LENGTHS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, defaultStoryLength: f.defaultStoryLength === opt.value ? null : opt.value }))}
                    className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                      form.defaultStoryLength === opt.value
                        ? "border-primary/60 bg-primary/15 text-foreground"
                        : "border-white/10 bg-muted/20 text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Story tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, tone: f.tone === opt.value ? null : opt.value }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      form.tone === opt.value
                        ? "border-primary/60 bg-primary/15 text-foreground"
                        : "border-white/10 bg-muted/20 text-muted-foreground hover:border-white/20 hover:text-foreground"
                    }`}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={() => void handleSave()}
              disabled={!form.name.trim() || saving}
            >
              {saving ? "Saving…" : dialogMode === "add" ? "Create profile" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
