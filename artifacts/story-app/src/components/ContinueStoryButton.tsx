import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

export function ContinueStoryButton({ disabled, loading, onClick }: Props) {
  return (
    <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 gap-2" disabled={disabled || loading} onClick={onClick}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
      Continue Story
    </Button>
  );
}
