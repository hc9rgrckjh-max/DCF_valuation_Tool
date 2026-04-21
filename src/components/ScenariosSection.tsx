import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Layers, Plus, Trash2 } from "lucide-react";
import type { DCFInputs, DCFResult } from "@/lib/dcf";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface Scenario {
  id: string;
  name: string;
  date: string;
  inputs: DCFInputs;
  result: DCFResult;
}

interface Props {
  scenarios: Scenario[];
  setScenarios: (s: Scenario[]) => void;
  inputs: DCFInputs;
  result: DCFResult | null;
  onLoad: (s: Scenario) => void;
  lang: Lang;
}

export const ScenariosSection = ({ scenarios, setScenarios, inputs, result, onLoad, lang }: Props) => {
  const [name, setName] = useState("");

  const verdictBadge = (v: DCFResult["verdict"]) => {
    const map = { UNDERVALUED: "v_under", OVERVALUED: "v_over", FAIRLY_VALUED: "v_fair" } as const;
    const cls =
      v === "UNDERVALUED" ? "bg-success text-success-foreground"
      : v === "OVERVALUED" ? "bg-destructive text-destructive-foreground"
      : "bg-muted text-muted-foreground";
    return <Badge className={cn("rounded-sm", cls)}>{t(lang, map[v])}</Badge>;
  };

  const save = () => {
    if (!name.trim() || !result) return;
    const s: Scenario = {
      id: crypto.randomUUID(),
      name: name.trim(),
      date: new Date().toLocaleDateString(),
      inputs: { ...inputs },
      result: { ...result },
    };
    setScenarios([s, ...scenarios]);
    setName("");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="rounded-sm">
        <CardContent className="p-4 flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t(lang, "scenarioName")}
            className="rounded-sm"
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <Button onClick={save} disabled={!name.trim() || !result} className="rounded-sm">
            <Plus strokeWidth={1.5} className="h-4 w-4 mr-1.5" />
            {t(lang, "saveScenario")}
          </Button>
        </CardContent>
      </Card>

      {scenarios.length === 0 ? (
        <div className="border border-dashed border-border rounded-sm py-12 text-center">
          <Layers strokeWidth={1.5} className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <div className="text-sm text-muted-foreground">{t(lang, "noScenarios")}</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scenarios.map((s) => (
              <Card key={s.id} className="rounded-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{s.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {s.inputs.companyName} • {s.date}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t(lang, "intrinsicValue")}</span>
                    <span className="font-mono-fin font-semibold">{formatCurrency(s.result.intrinsicValuePerShare)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t(lang, "upsideDownside")}</span>
                    <span className={cn("font-mono-fin font-semibold", s.result.upsideDownside >= 0 ? "text-success" : "text-destructive")}>
                      {(s.result.upsideDownside >= 0 ? "+" : "") + formatPercent(s.result.upsideDownside, 1)}
                    </span>
                  </div>
                  <div>{verdictBadge(s.result.verdict)}</div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="rounded-sm flex-1" onClick={() => onLoad(s)}>
                      {t(lang, "loadScenario")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-sm hover:text-destructive"
                      onClick={() => setScenarios(scenarios.filter((x) => x.id !== s.id))}
                    >
                      <Trash2 strokeWidth={1.5} className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">{t(lang, "comparison")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono-fin">
                  <thead>
                    <tr className="border-y border-border bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-right px-3 py-2">FCF g</th>
                      <th className="text-right px-3 py-2">WACC</th>
                      <th className="text-right px-3 py-2">TGR</th>
                      <th className="text-right px-3 py-2">{t(lang, "intrinsicValue")}</th>
                      <th className="text-right px-3 py-2">{t(lang, "upsideDownside")}</th>
                      <th className="text-right px-3 py-2">{t(lang, "verdict")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((s) => (
                      <tr key={s.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-3 py-2 font-sans">{s.name}</td>
                        <td className="px-3 py-2 text-right">{formatPercent(s.inputs.fcfGrowthRate)}</td>
                        <td className="px-3 py-2 text-right">{formatPercent(s.inputs.wacc)}</td>
                        <td className="px-3 py-2 text-right">{formatPercent(s.inputs.terminalGrowthRate)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(s.result.intrinsicValuePerShare)}</td>
                        <td className={cn("px-3 py-2 text-right", s.result.upsideDownside >= 0 ? "text-success" : "text-destructive")}>
                          {(s.result.upsideDownside >= 0 ? "+" : "") + formatPercent(s.result.upsideDownside, 1)}
                        </td>
                        <td className="px-3 py-2 text-right">{verdictBadge(s.result.verdict)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
