"use client";

import { useReactFlow } from "@xyflow/react";
import { FolderOpen, FilePlus2, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFlowStore } from "@/store/flow-store";
import { pickProjectFile } from "@/lib/project-io";
import { useT } from "@/lib/i18n";
import { useSettingsStore, type Language } from "@/store/settings-store";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "hu", label: "Magyar" },
  { code: "en", label: "English" },
];

export function WelcomeScreen() {
  const t = useT();
  const { fitView } = useReactFlow();

  const flowHydrated = useFlowStore((s) => s.hasHydrated);
  const nodes = useFlowStore((s) => s.nodes);
  const newProject = useFlowStore((s) => s.newProject);
  const loadProject = useFlowStore((s) => s.loadProject);
  const welcomeDismissed = useFlowStore((s) => s.welcomeDismissed);
  const setWelcomeDismissed = useFlowStore((s) => s.setWelcomeDismissed);

  const settingsHydrated = useSettingsStore((s) => s.hasHydrated);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const hasCabinets = nodes.some((n) => n.type === "cabinet");

  // Wait for both stores to hydrate so we don't flash on refresh.
  if (!flowHydrated || !settingsHydrated || welcomeDismissed || hasCabinets) {
    return null;
  }

  const handleNewProject = () => {
    newProject();
    setWelcomeDismissed(true);
  };

  const handleOpen = async () => {
    try {
      const project = await pickProjectFile();
      if (!project) return;
      loadProject(project);
      if (project.language) {
        setLanguage(project.language);
      }
      setWelcomeDismissed(true);
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 60);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t("menu.errorOpen"));
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/40 backdrop-blur-sm">
      <div className="w-[min(440px,90vw)] rounded-xl border bg-background/95 p-6 text-center shadow-xl">
        <h1 className="text-xl font-semibold">{t("app.name")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("welcome.subtitle")}</p>

        <div className="mt-5 flex flex-col gap-2">
          <Button type="button" onClick={handleNewProject} className="justify-center gap-2">
            <FilePlus2 className="h-4 w-4" />
            {t("welcome.newProject")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleOpen}
            className="justify-center gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            {t("welcome.openProject")}
          </Button>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs">
          <span className="text-muted-foreground">{t("welcome.language")}:</span>
          <div className="flex gap-1 rounded-md border p-0.5">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={cn(
                  "rounded px-2 py-0.5 transition-colors",
                  language === lang.code
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <MousePointerClick className="h-3.5 w-3.5" />
          {t("welcome.tip")}
        </p>
      </div>
    </div>
  );
}
