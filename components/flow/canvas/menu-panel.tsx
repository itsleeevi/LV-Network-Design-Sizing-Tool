"use client";

import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { FilePlus2, FolderOpen, Save, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFlowStore } from "@/store/flow-store";
import { saveProjectToFile, pickProjectFile } from "@/lib/project-io";
import { exportDiagramToPdf } from "@/lib/pdf-export";
import { useT } from "@/lib/i18n";
import { useSettingsStore } from "@/store/settings-store";
import { LegendSheet } from "./legend-sheet";

export function MenuPanel() {
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const { fitView } = useReactFlow();
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const loadProject = useFlowStore((s) => s.loadProject);
  const newProject = useFlowStore((s) => s.newProject);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useFlowStore((s) => s.setSelectedEdgeId);

  const [isExporting, setIsExporting] = useState(false);

  const refitView = () => {
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 60);
  };

  const handleNew = () => {
    const hasContent = nodes.some((n) => n.type === "cabinet");
    if (hasContent && !window.confirm(t("menu.confirmNew"))) {
      return;
    }
    newProject();
    refitView();
  };

  const handleOpen = async () => {
    try {
      const project = await pickProjectFile();
      if (!project) return;
      loadProject(project);
      if (project.language) {
        setLanguage(project.language);
      }
      refitView();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t("menu.errorOpen"));
    }
  };

  const handleSave = () => {
    saveProjectToFile(nodes, edges, language);
  };

  const handleExportPdf = async () => {
    if (isExporting) return;
    // Drop selection so highlight colors don't end up in the export.
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setIsExporting(true);
    try {
      // Let the deselection render before capturing the DOM.
      await new Promise((resolve) => setTimeout(resolve, 80));
      await exportDiagramToPdf(nodes, language);
    } catch {
      window.alert(t("menu.errorPdf"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-1 rounded-lg border bg-background p-1 shadow-sm">
      <Button type="button" size="sm" variant="ghost" onClick={handleNew} className="gap-1.5">
        <FilePlus2 className="h-4 w-4" />
        {t("menu.new")}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={handleOpen} className="gap-1.5">
        <FolderOpen className="h-4 w-4" />
        {t("menu.open")}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={handleSave} className="gap-1.5">
        <Save className="h-4 w-4" />
        {t("menu.save")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={handleExportPdf}
        disabled={isExporting}
        className="gap-1.5"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        PDF
      </Button>
      <LegendSheet />
    </div>
  );
}
