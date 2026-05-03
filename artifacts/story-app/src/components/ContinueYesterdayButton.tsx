import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  onClick: () => void;
}

export function ContinueYesterdayButton({ title, onClick }: Props) {
  return (
    <Button variant="outline" className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 gap-2" onClick={onClick}>
      <ArrowRight className="w-4 h-4" />
      Continue {title}
    </Button>
  );
}
