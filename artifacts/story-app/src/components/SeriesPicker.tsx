import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { StorySeries, CreateSeriesInput } from "@/hooks/useSeries";

interface Props {
  childId: number;
  series: StorySeries[];
  selectedSeriesId: number | null;
  onSelect: (series: StorySeries | null) => void;
  onCreate: (data: CreateSeriesInput) => Promise<void>;
  onUpdate: (id: number, data: { title: string; theme?: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

interface SeriesFormState {
  title: string;
  theme: string;
}

const emptyForm = (): SeriesFormState => ({ title: "", theme: "" });

export function SeriesPicker({ childId, series, selectedSeriesId, onSelect, onCreate, onUpdate, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [dialogMode, setDialogMode] = useState<"none" | "add" | "edit">("none");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SeriesFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const selectedSeries = series.find((s) => s.id === selectedSeriesId) ?? null;

  const openAdd = () => {
    setForm(emptyForm());
    setEditingId(null);
    setDialogMode("add");
  };

  const openEdit = (s: StorySeries) => {
    setForm({ title: s.title, theme: s.theme ?? "" });
    setEditingId(s.id);
    setDialogMode("edit");
  };

  const closeDialog = () => {
    setDialogMode("none");
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (dialogMode === "add") {
        await onCreate({ childId, title: form.title.trim(), theme: form.theme.trim() || undefined });
      } else if (dialogMode === "edit" && editingId) {
        await onUpdate(editingId, { title: form.title.trim(), theme: form.theme.trim() || undefined });
      }
      closeDialog();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await onDelete(id);
    if (selectedSeriesId === id) onSelect(null);
    setConfirmDeleteId(null);
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>
          {selectedSeries ? (
            <span className="text-foreground/80 font-medium">Series: {selectedSeries.title}</span>
          ) : (
            "Add to a series (optional)"
          )}
        </span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all duration-200 ${
                  selectedSeriesId === null
                    ? "bg-muted/50 border-white/20 text-foreground"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                }`}
              >
                None
              </button>

              <AnimatePresence initial={false}>
                {series.map((s) => {
                  const isSelected = selectedSeriesId === s.id;
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="flex items-center gap-1 group"
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(isSelected ? null : s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all duration-200 ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/30 border-white/10 hover:bg-muted/50 text-foreground/80"
                        }`}
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>{s.title}</span>
                        {s.storyCount > 0 && (
                          <span className={`text-[10px] ${isSelected ? "opacity-70" : "opacity-50"}`}>
                            ({s.storyCount})
                          </span>
                        )}
                        {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                      </button>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit series"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {confirmDeleteId === s.id ? (
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => void handleDelete(s.id)}
                              className="w-5 h-5 flex items-center justify-center rounded-full bg-destructive/20 hover:bg-destructive/40 text-destructive transition-colors"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 text-muted-foreground transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(s.id)}
                            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
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
                New series
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={dialogMode !== "none"} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {dialogMode === "add" ? "New series" : "Edit series"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Series name *</label>
              <Input
                placeholder="e.g. Bedtime Adventures"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Theme <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input
                placeholder="e.g. underwater world, space exploration"
                value={form.theme}
                onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={() => void handleSave()}
              disabled={!form.title.trim() || saving}
            >
              {saving ? "Saving…" : dialogMode === "add" ? "Create" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
