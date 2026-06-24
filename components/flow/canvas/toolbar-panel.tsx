"use client";

import { useReactFlow } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Move, Cable, Plus, Calculator, AlignHorizontalDistributeCenter } from "lucide-react";
import { useFlowStore } from "@/store/flow-store";

export function ToolbarPanel() {
  const { fitView } = useReactFlow();
  const {
    canvasMode,
    setCanvasMode,
    addCabinet,
    runCalculations,
    autoLayout,
  } = useFlowStore();

  const isMoveMode = canvasMode === "move";
  const isWireMode = canvasMode === "wire";

  const handleAutoLayout = () => {
    autoLayout();
    // Fit view after a short delay to allow state to update
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 50);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg border bg-background p-1 shadow-sm">
        <Button
          type="button"
          size="sm"
          variant={isMoveMode ? "default" : "ghost"}
          onClick={() => setCanvasMode("move")}
          className="gap-1.5"
        >
          <Move className="h-4 w-4" />
          Mozgatás
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isWireMode ? "default" : "ghost"}
          onClick={() => setCanvasMode("wire")}
          className="gap-1.5"
        >
          <Cable className="h-4 w-4" />
          Kötés
        </Button>
      </div>

      {/* Add elements */}
      <div className="flex flex-col gap-1 rounded-lg border bg-background p-2 shadow-sm">
        <span className="mb-1 text-xs font-medium text-muted-foreground">Elem hozzáadása</span>
        <Button type="button" size="sm" variant="outline" onClick={addCabinet} className="justify-start gap-1.5">
          <Plus className="h-3 w-3" />
          Szekrény (ESZ)
        </Button>
      </div>

      {/* Calculate button */}
      <Button type="button" onClick={runCalculations} className="gap-1.5">
        <Calculator className="h-4 w-4" />
        Számítás
      </Button>

      {/* Auto-layout button */}
      <Button type="button" variant="outline" onClick={handleAutoLayout} className="gap-1.5">
        <AlignHorizontalDistributeCenter className="h-4 w-4" />
        Rendezés
      </Button>
    </div>
  );
}
