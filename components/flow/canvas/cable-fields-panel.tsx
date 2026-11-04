"use client";

import { useState } from "react";
import { ChevronDown, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFlowStore } from "@/store/flow-store";
import { useT } from "@/lib/i18n";
import { resolveCablePdfFields } from "@/lib/cable-label";
import { cn } from "@/lib/utils";
import type { AszNodeData, CablePdfFieldKey } from "@/types/electrical";

/**
 * Diagram-wide choice of which lines every cable's info box shows. Collapsed
 * by default so it does not crowd the toolbar; the button shows how many
 * lines are on.
 */
export function CableFieldsPanel() {
  const t = useT();
  const nodes = useFlowStore((s) => s.nodes);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const [open, setOpen] = useState(false);

  const aszNode = nodes.find((n) => n.type === "asz");
  if (!aszNode) return null;

  const aszData = aszNode.data as AszNodeData;
  const fields = resolveCablePdfFields(nodes);

  const options: { key: CablePdfFieldKey; label: string }[] = [
    { key: "name", label: t("cable.name") },
    { key: "dimensions", label: t("pdf.fieldDimensions") },
    { key: "current", label: t("calc.totalCurrent") },
    { key: "allowedVoltageDropV", label: t("cable.allowedDropV") },
    { key: "recommendedCrossSection", label: t("cable.recommendedCrossSection") },
    { key: "voltageDropV", label: t("cable.dropV") },
    { key: "voltageDropPercent", label: t("cable.dropPercent") },
    { key: "impedance", label: t("cable.impedance") },
    { key: "shortCircuit", label: t("cable.iz") },
  ];
  const onCount = options.filter(({ key }) => fields[key]).length;

  const toggle = (key: CablePdfFieldKey, checked: boolean) => {
    updateNodeData(aszNode.id, {
      cablePdfFields: { ...aszData.cablePdfFields, [key]: checked },
    });
  };

  return (
    <div className="flex w-52 flex-col rounded-lg border bg-background shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="justify-start gap-1.5"
      >
        <Tags className="h-4 w-4" />
        <span className="flex-1 text-left">{t("pdf.cableFieldsTitle")}</span>
        <span className="rounded bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
          {onCount}/{options.length}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </Button>
      {open && (
        <div className="flex flex-col gap-1.5 border-t p-2">
          <p className="text-xs text-muted-foreground">{t("pdf.cableFieldsHint")}</p>
          {options.map(({ key, label }) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer accent-blue-600"
                checked={fields[key]}
                onChange={(e) => toggle(key, e.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
