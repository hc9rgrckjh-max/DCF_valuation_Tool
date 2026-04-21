import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Info } from "lucide-react";
import type { DCFInputs, DCFResult } from "@/lib/dcf";
import { generateSensitivityGrid, getSensitivityColor } from "@/lib/dcf";
import { formatBillions, formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  inputs: DCFInputs;
  result: DCFResult | null;
  lang: Lang;
}

const TICK = { fontSize: 11, fontFamily: "var(--font-mono)" };
const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.25rem",
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
};

const ChartPurpose = ({ title, desc, insight }: { title: string; desc: string; insight: string }) => (
  <div className="border-l-4 border-primary/50 bg-muted/30 px-3 py-2 rounded-sm mb-3">
    <div className="flex items-center gap-1.5 text-xs font-semibold mb-1">
      <Info strokeWidth={1.5} className="h-3.5 w-3.5 text-ai" />
      {title}
    </div>
    <div className="text-xs text-muted-foreground">{desc}</div>
    <div className="text-xs mt-1 font-mono-fin">{insight}</div>
  </div>
);

export const ChartsSection = ({ inputs, result, lang }: Props) => {
  const pvData = useMemo(
    () =>
      result
        ? [
            ...result.rows.map((r) => ({ name: `Y${r.year}`, value: r.pvFCF, type: "fcf" as const })),
            { name: "TV", value: result.pvTerminalValue, type: "tv" as const },
          ]
        : [],
    [result]
  );
  const grid = useMemo(() => generateSensitivityGrid(inputs), [inputs]);
  type WFRow = { name: string; start: number; value: number; kind: "year" | "tv" | "ev" };
  const waterfall = useMemo<WFRow[]>(() => {
    if (!result) return [];
    let cum = 0;
    const arr: WFRow[] = result.rows.map((r) => {
      const start = cum;
      cum += r.pvFCF;
      return { name: `Y${r.year}`, start, value: r.pvFCF, kind: "year" };
    });
    arr.push({ name: "TV", start: cum, value: result.pvTerminalValue, kind: "tv" });
    cum += result.pvTerminalValue;
    arr.push({ name: "EV", start: 0, value: cum, kind: "ev" });
    return arr;
  }, [result]);

  if (!result) {
    return (
      <div className="text-sm text-muted-foreground p-8 text-center border border-dashed border-border rounded-sm">
        Run a calculation to view charts.
      </div>
    );
  }
  const tvPct = (result.pvTerminalValue / result.enterpriseValue) * 100;
  const flatVals = grid.flat().map((c) => c.intrinsicValue).filter((v): v is number => v !== null);
  const minV = flatVals.length ? Math.min(...flatVals) : 0;
  const maxV = flatVals.length ? Math.max(...flatVals) : 0;
  const swing = minV ? ((maxV - minV) / minV) * 100 : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* PV Chart */}
      <Card className="rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide">{t(lang, "pvChart")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartPurpose
            title={t(lang, "whatChart")}
            desc={t(lang, "pvChartDesc")}
            insight={t(lang, "pvChartInsight").replace("{pct}", tvPct.toFixed(1))}
          />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={pvData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="name" tick={TICK} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={TICK} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatBillions(v, 1)} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => formatBillions(v, 2)}
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
              />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {pvData.map((d, i) => (
                  <Cell key={i} fill={d.type === "tv" ? "hsl(var(--chart-4))" : "hsl(var(--chart-1))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-chart-1" /> PV of FCF</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-chart-4" /> PV of Terminal Value</span>
          </div>
        </CardContent>
      </Card>

      {/* Sensitivity Grid */}
      <Card className="rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide">{t(lang, "sensTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartPurpose
            title={t(lang, "whatChart")}
            desc={t(lang, "sensDesc")}
            insight={t(lang, "sensInsight")
              .replace("{min}", formatNumber(minV, 2))
              .replace("{max}", formatNumber(maxV, 2))
              .replace("{swing}", swing.toFixed(1))}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono-fin">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-[10px] text-muted-foreground text-left">WACC ↓ \ TGR →</th>
                  {grid[0].map((c, i) => (
                    <th key={i} className="px-2 py-2 text-[10px] text-muted-foreground text-center font-medium">
                      {formatPercent(c.tgr, 2)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((row, ri) => (
                  <tr key={ri}>
                    <th className="px-2 py-2 text-[10px] text-muted-foreground text-left font-medium">
                      {formatPercent(row[0].wacc, 2)}
                    </th>
                    {row.map((c, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          "px-2 py-2 text-center text-xs font-medium",
                          getSensitivityColor(c.diffPct),
                          c.isBase && "ring-2 ring-primary ring-inset"
                        )}
                      >
                        {c.intrinsicValue !== null ? formatCurrency(c.intrinsicValue, 1) : "N/A"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-3 justify-center text-[10px] text-muted-foreground pt-3">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-600" /> {t(lang, "legendUnder")}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-zinc-500" /> {t(lang, "legendFair")}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500" /> {t(lang, "legendOver")}</span>
          </div>
          <div className="text-[10px] text-muted-foreground text-center mt-2">
            {t(lang, "sensNote").replace("{p}", formatNumber(inputs.currentPrice, 2))}
          </div>
        </CardContent>
      </Card>

      {/* Waterfall */}
      <Card className="rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide">{t(lang, "waterfallTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartPurpose
            title={t(lang, "whatChart")}
            desc={t(lang, "waterfallDesc")}
            insight={t(lang, "waterfallInsight").replace("{ev}", (result.enterpriseValue / 1000).toFixed(2))}
          />
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={waterfall} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="name" tick={TICK} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={TICK} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatBillions(v, 1)} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number, name: string) => name === "start" ? null : formatBillions(v, 2)}
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
              />
              <Bar dataKey="start" stackId="a" fill="transparent" />
              <Bar dataKey="value" stackId="a" radius={[2, 2, 0, 0]}>
                {waterfall.map((d, i) => (
                  <Cell key={i} fill={d.kind === "tv" ? "hsl(var(--chart-4))" : d.kind === "ev" ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))"} />
                ))}
              </Bar>
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
