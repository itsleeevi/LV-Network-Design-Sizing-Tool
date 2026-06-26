"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useT, translate, type TranslationKey } from "@/lib/i18n";
import { useSettingsStore } from "@/store/settings-store";

function LegendRow({ abbr, meaning }: { abbr: string; meaning: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="mt-px inline-flex min-w-12 shrink-0 justify-center rounded border bg-muted px-1.5 py-0.5 text-center font-mono text-xs font-medium">
        {abbr}
      </span>
      <span className="text-sm text-muted-foreground">{meaning}</span>
    </div>
  );
}

function LegendSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

export function LegendSheet() {
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  const abbr = (key: TranslationKey) => translate(language, key);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" size="sm" variant="ghost" className="gap-1.5" title={t("menu.legend")}>
          <HelpCircle className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-sm">
        <SheetHeader className="p-0">
          <SheetTitle>{t("legend.title")}</SheetTitle>
          <SheetDescription>{t("legend.subtitle")}</SheetDescription>
        </SheetHeader>

        <div className="mt-2 space-y-5">
          <LegendSection title={t("legend.elements")}>
            <LegendRow abbr={abbr("node.asz.name")} meaning={t("legend.asz")} />
            <LegendRow abbr={abbr("node.fm.name")} meaning={t("legend.fm")} />
            <LegendRow abbr={abbr("cabinet.defaultLabel")} meaning={t("legend.esz")} />
          </LegendSection>

          <LegendSection title={t("legend.cables")}>
            <LegendRow abbr={abbr("cable.kv04")} meaning={t("legend.cable04")} />
            <LegendRow abbr={abbr("cable.uhe")} meaning={t("legend.cableUhe")} />
          </LegendSection>

          <LegendSection title={t("legend.values")}>
            <LegendRow abbr="Iz" meaning={t("legend.iz")} />
            <LegendRow abbr={t("calc.loopImpedance")} meaning={t("legend.loop")} />
            <LegendRow abbr={t("calc.voltageDrop")} meaning={t("legend.drop")} />
          </LegendSection>

          <LegendSection title={t("legend.units")}>
            <LegendRow abbr={abbr("unit.kmsz")} meaning={t("legend.kmsz")} />
            <LegendRow abbr={abbr("unit.side")} meaning={t("legend.side")} />
          </LegendSection>
        </div>
      </SheetContent>
    </Sheet>
  );
}
