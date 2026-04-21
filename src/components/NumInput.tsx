import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpHint } from "./HelpHint";
import type { TooltipEntry } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  tooltip?: TooltipEntry;
  helper?: string;
  helperColor?: string;
}

export const NumInput = ({ label, value, onChange, step = 1, tooltip, helper, helperColor }: Props) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</Label>
      <HelpHint entry={tooltip} />
    </div>
    <Input
      type="number"
      step={step}
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="rounded-sm font-mono-fin text-right h-9"
    />
    {helper && <p className={cn("text-[10px]", helperColor ?? "text-muted-foreground")}>{helper}</p>}
  </div>
);

interface TextProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tooltip?: TooltipEntry;
}

export const TextInput = ({ label, value, onChange, tooltip }: TextProps) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</Label>
      <HelpHint entry={tooltip} />
    </div>
    <Input value={value} onChange={(e) => onChange(e.target.value)} className="rounded-sm h-9" />
  </div>
);
