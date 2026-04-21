import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TooltipEntry } from "@/lib/i18n";

export const HelpHint = ({ entry }: { entry?: TooltipEntry }) => {
  if (!entry) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle strokeWidth={1.5} className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs rounded-sm">
          <div className="space-y-1.5">
            <div className="font-semibold text-xs">{entry.title}</div>
            <div className="text-xs text-muted-foreground">{entry.description}</div>
            {entry.formula && (
              <div className="font-mono-fin text-[10px] bg-muted px-1.5 py-1 rounded-sm">{entry.formula}</div>
            )}
            {entry.typical && (
              <div className="text-[10px] text-muted-foreground italic">Typical: {entry.typical}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
