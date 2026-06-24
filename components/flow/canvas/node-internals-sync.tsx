"use client";

import { useEffect } from "react";
import { useReactFlow, useUpdateNodeInternals } from "@xyflow/react";
import { useFlowStore } from "@/store/flow-store";

/** Re-measure handle positions after mode switch (layout must settle first). */
export function NodeInternalsSync() {
  const { getNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const canvasMode = useFlowStore((s) => s.canvasMode);

  useEffect(() => {
    const remeasure = () => {
      for (const node of getNodes()) {
        updateNodeInternals(node.id);
      }
    };

    remeasure();
    const raf = requestAnimationFrame(() => {
      remeasure();
      requestAnimationFrame(remeasure);
    });

    return () => cancelAnimationFrame(raf);
  }, [canvasMode, getNodes, updateNodeInternals]);

  return null;
}
