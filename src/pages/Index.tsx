import { useEffect, useMemo, useState } from "react";
import { Sidebar, type Section } from "@/components/Sidebar";
import { InputSection } from "@/components/InputSection";
import { ResultsSection } from "@/components/ResultsSection";
import { ChartsSection } from "@/components/ChartsSection";
import { ScenariosSection, type Scenario } from "@/components/ScenariosSection";
import { DEFAULT_INPUTS, STORAGE } from "@/lib/constants";
import { calculateDCF, type DCFInputs } from "@/lib/dcf";
import type { Lang } from "@/lib/i18n";

const loadJSON = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

const Index = () => {
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem(STORAGE.THEME) as "dark" | "light") || "light");
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(STORAGE.LANG) as Lang) || "en");
  const [active, setActive] = useState<Section>("inputs");
  const [inputs, setInputs] = useState<DCFInputs>(() => loadJSON(STORAGE.INPUTS, DEFAULT_INPUTS));
  const [scenarios, setScenarios] = useState<Scenario[]>(() => loadJSON(STORAGE.SCENARIOS, [] as Scenario[]));
  const [liveMode, setLiveMode] = useState<boolean>(() => localStorage.getItem(STORAGE.MODE) === "live");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE.THEME, theme);
  }, [theme]);
  useEffect(() => { localStorage.setItem(STORAGE.LANG, lang); }, [lang]);
  useEffect(() => { localStorage.setItem(STORAGE.INPUTS, JSON.stringify(inputs)); }, [inputs]);
  useEffect(() => { localStorage.setItem(STORAGE.SCENARIOS, JSON.stringify(scenarios)); }, [scenarios]);
  useEffect(() => { localStorage.setItem(STORAGE.MODE, liveMode ? "live" : "manual"); }, [liveMode]);

  const result = useMemo(() => calculateDCF(inputs), [inputs]);

  return (
    <div className="min-h-screen w-full bg-background">
      <Sidebar active={active} setActive={setActive} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
      <main className="md:ml-64 pt-[88px] md:pt-0 p-4 md:p-8 max-w-7xl">
        <h1 className="sr-only">DCF Valuation Tool</h1>
        {active === "inputs" && (
          <InputSection
            inputs={inputs}
            setInputs={setInputs}
            lang={lang}
            liveMode={liveMode}
            setLiveMode={setLiveMode}
            onCalculate={() => setActive("results")}
          />
        )}
        {active === "results" && <ResultsSection inputs={inputs} result={result} lang={lang} />}
        {active === "charts" && <ChartsSection inputs={inputs} result={result} lang={lang} />}
        {active === "scenarios" && (
          <ScenariosSection
            scenarios={scenarios}
            setScenarios={setScenarios}
            inputs={inputs}
            result={result}
            onLoad={(s) => { setInputs(s.inputs); setActive("results"); }}
            lang={lang}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
