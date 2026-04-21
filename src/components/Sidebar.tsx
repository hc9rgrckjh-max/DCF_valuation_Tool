import { Calculator, TrendingUp, BarChart3, Layers, Languages, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGS, t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type Section = "inputs" | "results" | "charts" | "scenarios";

interface Props {
  active: Section;
  setActive: (s: Section) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
}

const items = [
  { id: "inputs" as const, icon: Calculator, key: "navInputs" },
  { id: "results" as const, icon: TrendingUp, key: "navResults" },
  { id: "charts" as const, icon: BarChart3, key: "navCharts" },
  { id: "scenarios" as const, icon: Layers, key: "navScenarios" },
];

export const Sidebar = ({ active, setActive, lang, setLang, theme, setTheme }: Props) => {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 border-r border-border bg-card flex-col z-30">
        <div className="px-5 py-5 border-b border-border">
          <div className="text-base font-bold tracking-tight">{t(lang, "appTitle")}</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{t(lang, "appSubtitle")}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = active === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setActive(it.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/50 text-foreground"
                )}
              >
                <Icon strokeWidth={1.5} className="h-4 w-4" />
                {t(lang, it.key)}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2">
            <Languages strokeWidth={1.5} className="h-4 w-4 text-muted-foreground" />
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger className="rounded-sm h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-sm">
                {LANGS.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm w-full justify-start"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun strokeWidth={1.5} className="h-4 w-4 mr-2" />
            ) : (
              <Moon strokeWidth={1.5} className="h-4 w-4 mr-2" />
            )}
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
        </div>
      </aside>

      {/* Mobile top header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-card border-b border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <div>
            <div className="text-sm font-bold">{t(lang, "appTitle")}</div>
          </div>
          <div className="flex items-center gap-1">
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger className="rounded-sm h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-sm">
                {LANGS.map((l) => <SelectItem key={l.code} value={l.code}>{l.code.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="rounded-sm h-7 w-7" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun strokeWidth={1.5} className="h-4 w-4" /> : <Moon strokeWidth={1.5} className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex overflow-x-auto border-t border-border">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = active === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setActive(it.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors",
                  isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
                )}
              >
                <Icon strokeWidth={1.5} className="h-3.5 w-3.5" />
                {t(lang, it.key)}
              </button>
            );
          })}
        </div>
      </header>
    </>
  );
};
