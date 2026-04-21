import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Wifi, WifiOff, Search, Info, ChevronDown, RotateCcw, Calculator } from "lucide-react";
import { NumInput, TextInput } from "@/components/NumInput";
import { HelpHint } from "@/components/HelpHint";
import { calculateWACC } from "@/lib/dcf";
import type { DCFInputs } from "@/lib/dcf";
import { DEFAULT_INPUTS, INDUSTRY_KEYS, VALIDATION } from "@/lib/constants";
import { TOOLTIPS, t, type Lang } from "@/lib/i18n";
import { formatNumber, formatPercent } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  inputs: DCFInputs;
  setInputs: (i: DCFInputs) => void;
  lang: Lang;
  liveMode: boolean;
  setLiveMode: (b: boolean) => void;
  onCalculate: () => void;
}

export const InputSection = ({ inputs, setInputs, lang, liveMode, setLiveMode, onCalculate }: Props) => {
  const tt = TOOLTIPS[lang];
  const set = <K extends keyof DCFInputs>(k: K, v: DCFInputs[K]) => setInputs({ ...inputs, [k]: v });

  const [ticker, setTicker] = useState("");
  const [fetching, setFetching] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [howOpen, setHowOpen] = useState(false);

  // Auto-recompute WACC when CAPM components change
  useEffect(() => {
    if (!inputs.useWaccDecomposition) return;
    const w = calculateWACC(inputs);
    if (Math.abs(w.wacc - inputs.wacc) > 0.0001) set("wacc", parseFloat(w.wacc.toFixed(4)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.useWaccDecomposition, inputs.riskFreeRate, inputs.beta, inputs.equityRiskPremium, inputs.costOfDebt, inputs.taxRate, inputs.equityWeight]);

  const waccComp = useMemo(() => calculateWACC(inputs), [inputs]);

  const fcfPreview = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        year: i + 1,
        fcf: inputs.baseFCF * Math.pow(1 + inputs.fcfGrowthRate / 100, i + 1),
      })),
    [inputs.baseFCF, inputs.fcfGrowthRate]
  );

  const blockingError = inputs.terminalGrowthRate >= inputs.wacc;
  const warnings: string[] = [];
  if (inputs.wacc < VALIDATION.WACC_LOW) warnings.push(t(lang, "warnWaccLow"));
  if (inputs.wacc > VALIDATION.WACC_HIGH) warnings.push(t(lang, "warnWaccHigh"));
  if (inputs.fcfGrowthRate > VALIDATION.GROWTH_HIGH) warnings.push(t(lang, "warnGrowth"));
  if (inputs.terminalGrowthRate > VALIDATION.TGR_HIGH) warnings.push(t(lang, "warnTGR"));
  if (inputs.baseFCF > VALIDATION.FCF_HIGH) warnings.push(t(lang, "warnFCF"));

  const fetchTicker = async () => {
    if (!ticker.trim()) return;
    setFetching(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-live-data", {
        body: { ticker: ticker.trim().toUpperCase() },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Fetch failed");
      setInputs({
        ...inputs,
        companyName: data.company_name ?? inputs.companyName,
        currentPrice: data.current_price ?? inputs.currentPrice,
        sharesOutstanding: data.shares_outstanding ?? inputs.sharesOutstanding,
        baseFCF: data.free_cash_flow ?? inputs.baseFCF,
        industry: data.industry ?? inputs.industry,
        netDebt: data.net_debt ?? inputs.netDebt,
        beta: data.beta ?? inputs.beta,
      });
      setLastFetched(ticker.trim().toUpperCase());
      toast.success(`${t(lang, "fetchedFor")} ${ticker.trim().toUpperCase()}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t(lang, "fetchError");
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Mode toggle */}
      <Card className="rounded-sm border-dashed">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {liveMode ? (
              <Wifi strokeWidth={1.5} className="h-5 w-5 text-success" />
            ) : (
              <WifiOff strokeWidth={1.5} className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <div className="text-sm font-medium">{liveMode ? t(lang, "liveMode") : t(lang, "manualMode")}</div>
              <div className="text-xs text-muted-foreground">{liveMode ? t(lang, "liveModeDesc") : t(lang, "manualModeDesc")}</div>
            </div>
          </div>
          <Switch checked={liveMode} onCheckedChange={setLiveMode} />
        </CardContent>
      </Card>

      {liveMode && (
        <Card className="rounded-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t(lang, "ticker")}</Label>
              <HelpHint entry={tt.ticker} />
            </div>
            <div className="flex gap-2">
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && fetchTicker()}
                placeholder="AAPL"
                className="rounded-sm font-mono-fin uppercase"
              />
              <Button onClick={fetchTicker} disabled={fetching || !ticker.trim()} className="rounded-sm">
                <Search strokeWidth={1.5} className="h-4 w-4 mr-1.5" />
                {t(lang, "fetch")}
              </Button>
            </div>
            {lastFetched && !fetchError && (
              <div className="text-xs text-success font-mono-fin">✓ {t(lang, "fetchedFor")} {lastFetched}</div>
            )}
            {fetchError && <div className="text-xs text-destructive">{fetchError}</div>}
          </CardContent>
        </Card>
      )}

      {/* How DCF works */}
      <Collapsible open={howOpen} onOpenChange={setHowOpen}>
        <Card className="rounded-sm">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Info strokeWidth={1.5} className="h-4 w-4 text-ai" />
                <span className="text-sm font-medium">{t(lang, "howDcfWorks")}</span>
              </div>
              <ChevronDown strokeWidth={1.5} className={`h-4 w-4 transition-transform ${howOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3 text-sm">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="border-l-2 border-primary/30 pl-3">
                  <div className="font-medium text-xs">{t(lang, `step${n}Title`)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t(lang, `step${n}`)}</div>
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Company */}
        <Card className="rounded-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">{t(lang, "cardCompany")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TextInput label={t(lang, "companyName")} value={inputs.companyName} onChange={(v) => set("companyName", v)} tooltip={tt.companyName} />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{t(lang, "industry")}</Label>
                <HelpHint entry={tt.industry} />
              </div>
              <Select value={inputs.industry} onValueChange={(v) => set("industry", v)}>
                <SelectTrigger className="rounded-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-sm">
                  {INDUSTRY_KEYS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <NumInput label={t(lang, "currentPrice")} value={inputs.currentPrice} onChange={(v) => set("currentPrice", v)} step={0.01} tooltip={tt.currentPrice} />
            <NumInput label={t(lang, "sharesOutstanding")} value={inputs.sharesOutstanding} onChange={(v) => set("sharesOutstanding", v)} tooltip={tt.sharesOutstanding} />
            <NumInput label={t(lang, "netDebt")} value={inputs.netDebt} onChange={(v) => set("netDebt", v)} tooltip={tt.netDebt} helper={t(lang, "netDebtHelp")} />
          </CardContent>
        </Card>

        {/* FCF */}
        <Card className="rounded-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">{t(lang, "cardFCF")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NumInput label={t(lang, "baseFCF")} value={inputs.baseFCF} onChange={(v) => set("baseFCF", v)} tooltip={tt.baseFCF} />
            <NumInput label={t(lang, "fcfGrowthRate")} value={inputs.fcfGrowthRate} onChange={(v) => set("fcfGrowthRate", v)} step={0.1} tooltip={tt.fcfGrowthRate} />
            <div className="border border-border rounded-sm overflow-hidden">
              <div className="bg-muted/50 px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                {t(lang, "fcfPreview")}
              </div>
              <table className="w-full text-xs font-mono-fin">
                <tbody>
                  {fcfPreview.map((r) => (
                    <tr key={r.year} className="border-t border-border">
                      <td className="px-3 py-1.5 text-muted-foreground">Y{r.year}</td>
                      <td className="px-3 py-1.5 text-right">€{formatNumber(r.fcf, 0)}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Discount */}
        <Card className="rounded-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">{t(lang, "cardDiscount")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{t(lang, "wacc")}</Label>
                <HelpHint entry={tt.wacc} />
              </div>
              <Input
                type="number"
                step={0.01}
                value={inputs.wacc.toFixed(2)}
                onChange={(e) => set("wacc", parseFloat(e.target.value) || 0)}
                disabled={inputs.useWaccDecomposition}
                className="rounded-sm font-mono-fin text-right h-9 disabled:opacity-70"
              />
              <p className="text-[10px] text-muted-foreground">{t(lang, "waccHelp")}</p>
            </div>
            <NumInput label={t(lang, "tgr")} value={inputs.terminalGrowthRate} onChange={(v) => set("terminalGrowthRate", v)} step={0.1} tooltip={tt.terminalGrowthRate} helper={t(lang, "tgrHelp")} />
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{t(lang, "midYear")}</Label>
                  <HelpHint entry={tt.useMidYear} />
                </div>
                <Switch checked={inputs.useMidYear} onCheckedChange={(v) => set("useMidYear", v)} />
              </div>
              <p className="text-[10px] text-muted-foreground">{inputs.useMidYear ? t(lang, "midYearOn") : t(lang, "midYearOff")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WACC Builder */}
      <Card className="rounded-sm">
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">{t(lang, "cardWACC")}</CardTitle>
            <CardDescription className="text-xs mt-1">CAPM-based decomposition</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{inputs.useWaccDecomposition ? t(lang, "waccAuto") : t(lang, "waccManual")}</span>
            <Switch checked={inputs.useWaccDecomposition} onCheckedChange={(v) => set("useWaccDecomposition", v)} />
          </div>
        </CardHeader>
        <CardContent>
          {!inputs.useWaccDecomposition ? (
            <div className="text-xs text-muted-foreground py-4 text-center">{t(lang, "waccOff")}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border pb-1">{t(lang, "costOfEquity")}</div>
                  <NumInput label={t(lang, "rf")} value={inputs.riskFreeRate} onChange={(v) => set("riskFreeRate", v)} step={0.01} tooltip={tt.riskFreeRate} helper={t(lang, "rfHelp")} />
                  <NumInput label={t(lang, "beta")} value={inputs.beta} onChange={(v) => set("beta", v)} step={0.01} tooltip={tt.beta} />
                  <NumInput label={t(lang, "erp")} value={inputs.equityRiskPremium} onChange={(v) => set("equityRiskPremium", v)} step={0.01} tooltip={tt.equityRiskPremium} helper={t(lang, "erpHelp")} />
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border pb-1">{t(lang, "costOfDebt")}</div>
                  <NumInput label={t(lang, "rd")} value={inputs.costOfDebt} onChange={(v) => set("costOfDebt", v)} step={0.01} tooltip={tt.costOfDebt} />
                  <NumInput label={t(lang, "taxRate")} value={inputs.taxRate} onChange={(v) => set("taxRate", v)} step={0.1} tooltip={tt.taxRate} />
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border pb-1">{t(lang, "capitalStructure")}</div>
                  <NumInput
                    label={t(lang, "equityWeight")}
                    value={inputs.equityWeight}
                    onChange={(v) => set("equityWeight", v)}
                    step={1}
                    tooltip={tt.equityWeight}
                    helper={`${t(lang, "debtWeightHelp")}${(100 - inputs.equityWeight).toFixed(0)}%`}
                  />
                </div>
              </div>

              <div className="bg-primary/5 border border-border rounded-sm p-4 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{t(lang, "waccBreakdown")}</div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs">{t(lang, "re")} = Rf + β × ERP</span>
                  <span className="font-mono-fin text-sm text-ai">{formatPercent(waccComp.costOfEquity, 2)}</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono-fin pl-2">
                  = {formatPercent(inputs.riskFreeRate, 2)} + {inputs.beta.toFixed(2)} × {formatPercent(inputs.equityRiskPremium, 2)}
                </div>
                <div className="flex items-baseline justify-between pt-2">
                  <span className="text-xs">{t(lang, "rdAfterTax")} = Rd × (1−T)</span>
                  <span className="font-mono-fin text-sm text-orange-600 dark:text-orange-400">{formatPercent(waccComp.afterTaxCostOfDebt, 2)}</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono-fin pl-2">
                  = {formatPercent(inputs.costOfDebt, 2)} × (1 − {formatPercent(inputs.taxRate, 0)})
                </div>
                <div className="flex items-baseline justify-between pt-3 border-t border-border mt-2">
                  <span className="text-sm font-semibold">WACC</span>
                  <span className="font-mono-fin text-2xl font-bold text-primary">{formatPercent(waccComp.wacc, 2)}</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono-fin pl-2">
                  = {inputs.equityWeight}% × {formatPercent(waccComp.costOfEquity, 2)} + {(100 - inputs.equityWeight).toFixed(0)}% × {formatPercent(waccComp.afterTaxCostOfDebt, 2)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation */}
      {blockingError && (
        <div className="rounded-sm border border-destructive bg-destructive/10 px-4 py-2.5 flex items-center gap-2 text-destructive">
          <AlertTriangle strokeWidth={1.5} className="h-4 w-4" />
          <span className="text-sm font-medium">{t(lang, "errTGR")}</span>
        </div>
      )}
      {warnings.map((w) => (
        <div key={w} className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle strokeWidth={1.5} className="h-4 w-4" />
          <span className="text-xs">{w}</span>
        </div>
      ))}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button variant="outline" className="rounded-sm" onClick={() => setInputs(DEFAULT_INPUTS)}>
          <RotateCcw strokeWidth={1.5} className="h-4 w-4 mr-1.5" />
          {t(lang, "reset")}
        </Button>
        <Button size="lg" className="rounded-sm flex-1 max-w-md mx-auto" disabled={blockingError} onClick={onCalculate}>
          <Calculator strokeWidth={1.5} className="h-4 w-4 mr-2" />
          {t(lang, "calculate")}
        </Button>
      </div>
    </div>
  );
};
