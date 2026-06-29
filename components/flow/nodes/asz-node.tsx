"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import type { AszNodeData } from "@/types/electrical";
import { useFlowStore } from "@/store/flow-store";
import {
  ASZ_LABEL_PRIORITY,
  getConnectedSides,
  getOccupiedSides,
  getLabelPlacement,
  labelOffsetClass,
} from "@/lib/cabinet-label-placement";
import { SchematicBoxPorts } from "./schematic-box-ports";
import { useElementName } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const BOX_W = 52;
const BOX_H = 22;

/** ÁSZ: horizontal box with two overlapping circles (transformer symbol). */
export function AszNode({ id, data, selected }: NodeProps) {
  const elementName = useElementName();
  const d = data as AszNodeData;
  const canvasMode = useFlowStore((s) => s.canvasMode);
  const edges = useFlowStore((s) => s.edges);
  const nodes = useFlowStore((s) => s.nodes);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const wireMode = canvasMode === "wire";

  const connectedSides = useMemo(
    () => getConnectedSides(id, edges, nodes),
    [id, edges, nodes],
  );

  const occupiedSides = useMemo(
    () => getOccupiedSides(id, edges, nodes),
    [id, edges, nodes],
  );

  const labelPlacement = useMemo(
    () => getLabelPlacement(occupiedSides, ASZ_LABEL_PRIORITY),
    [occupiedSides],
  );

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
          "pointer-events-none absolute z-10 w-max whitespace-nowrap rounded bg-white px-1 text-xs font-medium leading-none text-red-600",
          labelOffsetClass[labelPlacement],
        )}
      >
        {elementName(d.title, "asz")}
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

      <svg
        width={BOX_W - 8}
        height={BOX_H - 4}
        viewBox="0 0 44 18"
        className="relative z-[1] pointer-events-none"
        aria-hidden
      >
        <circle cx={15} cy={9} r={7} fill="none" stroke="#000" strokeWidth={1.25} />
        <circle cx={29} cy={9} r={7} fill="none" stroke="#000" strokeWidth={1.25} />
      </svg>

      <Handle type="source" position={Position.Top} id="top" className="schematic-port" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="schematic-port" />
    </div>
  );
}
