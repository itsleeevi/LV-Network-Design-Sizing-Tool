"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import type { FeedNodeData } from "@/types/electrical";
import { useFlowStore } from "@/store/flow-store";
import {
  FM_LABEL_PRIORITY,
  getConnectedSides,
  getLabelPlacement,
  labelOffsetClass,
} from "@/lib/cabinet-label-placement";
import { SchematicBoxPorts } from "./schematic-box-ports";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const BOX_W = 52;
const BOX_H = 22;

/** FM feed point below ÁSZ — label avoids sides with wires. */
export function FeedNode({ id, data, selected }: NodeProps) {
  const d = data as FeedNodeData;
  const canvasMode = useFlowStore((s) => s.canvasMode);
  const edges = useFlowStore((s) => s.edges);
  const nodes = useFlowStore((s) => s.nodes);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const wireMode = canvasMode === "wire";

  const connectedSides = useMemo(
    () => getConnectedSides(id, edges, nodes),
    [id, edges, nodes],
  );

  const labelPlacement = useMemo(
    () => getLabelPlacement(connectedSides, FM_LABEL_PRIORITY),
    [connectedSides],
  );

  const label = d.label || "FM";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(id);
  };

  return (
    <div
      className={cn(
        "relative overflow-visible flex items-center justify-center border bg-white font-sans",
        "border-black",
        wireMode && "ring-1 ring-blue-400/60",
        selected && "ring-2 ring-blue-500 ring-offset-1",
      )}
      style={{ width: BOX_W, height: BOX_H }}
      onClick={handleClick}
    >
      <div
        className={cn(
          "pointer-events-none absolute z-10 w-max whitespace-nowrap text-xs font-medium leading-none text-red-600",
          labelOffsetClass[labelPlacement],
        )}
      >
        {label}
      </div>

      <svg
        width={BOX_W}
        height={BOX_H}
        viewBox={`0 0 ${BOX_W} ${BOX_H}`}
        className="absolute inset-0 pointer-events-none"
        aria-hidden
      >
        <SchematicBoxPorts
          width={BOX_W}
          height={BOX_H}
          wireMode={wireMode}
          connectedSides={connectedSides}
        />
      </svg>

      <div className="relative z-[1] h-2.5 w-2.5 rounded-full bg-black pointer-events-none" aria-hidden />

      <Handle type="source" position={Position.Top} id="top" className="schematic-port" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="schematic-port" />
      <Handle type="source" position={Position.Left} id="left" className="schematic-port" />
      <Handle type="source" position={Position.Right} id="right" className="schematic-port" />
    </div>
  );
}
