import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clipboard, FileDown } from "lucide-react";
import type { DCFInputs, DCFResult } from "@/lib/dcf";
import { formatCurrency, formatMillions, formatNumber, formatPercent } from "@/lib/formatters";
import { t, type Lang } from "@/lib/i18n";
import { exportPDF, exportResultsToClipboard } from "@/lib/pdfExport";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  inputs: DCFInputs;
  result: DCFResult | null;
  lang: Lang;
}

export const ResultsSection = ({ inputs, result, lang }: Props) => {
  if (!result) {
    return (
      <div className="text-sm text-muted-foreground p-8 text-center border border-dashed border-border rounded-sm">
        Run a calculation to see results.
      </div>
    );
  }
  const upPositive = result.upsideDownside >= 0;
  const verdictMap = { UNDERVALUED: "v_under", OVERVALUED: "v_over", FAIRLY_VALUED: "v_fair" } as const;
  const verdictColor =
    result.verdict === "UNDERVALUED"
      ? "bg-success text-success-foreground"
      : result.verdict === "OVERVALUED"
      ? "bg-destructive text-destructive-foreground"
      : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            {inputs.companyName} • {inputs.industry} • {inputs.useMidYear ? t(lang, "conventionMid") : t(lang, "conventionEnd")} {t(lang, "convention")}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm"
            onClick={async () => {
              await exportResultsToClipboard(inputs, result);
              toast.success("Copied to clipboard");
            }}
          >
            <Clipboard strokeWidth={1.5} className="h-4 w-4 mr-1.5" />
            {t(lang, "exportClipboard")}
          </Button>
          <Button size="sm" className="rounded-sm" onClick={() => exportPDF(inputs, result)}>
            <FileDown strokeWidth={1.5} className="h-4 w-4 mr-1.5" />
            {t(lang, "exportPDF")}
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label={t(lang, "intrinsicValue")} value={formatCurrency(result.intrinsicValuePerShare)} />
        <MetricCard label={t(lang, "marketPrice")} value={formatCurrency(inputs.currentPrice)} />
        <MetricCard
          label={t(lang, "upsideDownside")}
          value={(upPositive ? "+" : "") + formatPercent(result.upsideDownside, 2)}
          valueClass={upPositive ? "text-success" : "text-destructive"}
        />
        <Card className="rounded-sm">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">{t(lang, "verdict")}</div>
            <Badge className={cn("rounded-sm text-sm font-semibold px-3 py-1", verdictColor)}>
              {t(lang, verdictMap[result.verdict])}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown table */}
      <Card className="rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide">{t(lang, "breakdown")}</CardTitle>
          <div className="text-[10px] text-muted-foreground">
            {inputs.useMidYear ? "Mid-year discounting (t = year − 0.5)" : "End-of-year discounting (t = year)"}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs font-mono-fin">
            <thead>
              <tr className="border-y border-border bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">{t(lang, "year")}</th>
                <th className="text-right px-4 py-2 font-medium">{t(lang, "fcf")}</th>
                <th className="text-right px-4 py-2 font-medium">{t(lang, "df")}</th>
                <th className="text-right px-4 py-2 font-medium">{t(lang, "pv")}</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.year} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2">Y{r.year}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(r.fcf, 0)}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(r.discountFactor, 4)}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(r.pvFCF, 0)}</td>
                </tr>
              ))}
              <tr className="border-b border-border">
                <td className="px-4 py-2 text-muted-foreground">TV</td>
                <td className="px-4 py-2 text-right text-muted-foreground">{formatNumber(result.terminalValue, 0)}</td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2 text-right">{formatNumber(result.pvTerminalValue, 0)}</td>
              </tr>
              <tr className="bg-muted font-semibold">
                <td className="px-4 py-2" colSpan={3}>{t(lang, "totalEV")}</td>
                <td className="px-4 py-2 text-right">{formatNumber(result.enterpriseValue, 0)}</td>
              </tr>
              <tr className="bg-primary/5 text-base font-bold">
                <td className="px-4 py-3" colSpan={3}>{t(lang, "ivps")}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(result.intrinsicValuePerShare)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <SummaryCard label={t(lang, "sumPV")} value={formatMillions(result.sumPV)} />
        <SummaryCard label={t(lang, "tv")} value={formatMillions(result.terminalValue)} />
        <SummaryCard label={t(lang, "pvTVShort")} value={formatMillions(result.pvTerminalValue)} />
        <SummaryCard label={t(lang, "ev")} value={formatMillions(result.enterpriseValue)} />
        <SummaryCard label={t(lang, "netDebt")} value={formatMillions(result.netDebt)} valueClass="text-destructive" />
        <SummaryCard label={t(lang, "equityValue")} value={formatMillions(result.equityValue)} bold />
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) => (
  <Card className="rounded-sm">
    <CardContent className="p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">{label}</div>
      <div className={cn("text-2xl font-bold font-mono-fin", valueClass)}>{value}</div>
    </CardContent>
  </Card>
);

const SummaryCard = ({ label, value, valueClass, bold }: { label: string; value: string; valueClass?: string; bold?: boolean }) => (
  <Card className={cn("rounded-sm", bold && "border-t-2 border-t-primary")}>
    <CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</div>
      <div className={cn("text-base font-mono-fin", bold && "font-bold text-lg", valueClass)}>{value}</div>
    </CardContent>
  </Card>
);
