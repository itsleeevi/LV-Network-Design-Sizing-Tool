"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import type { FeNodeData } from "@/types/electrical";
import { useFlowStore } from "@/store/flow-store";
import { getConnectedSides } from "@/lib/cabinet-label-placement";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const BOX_W = 52;
const BOX_H = 22;

/** FE (Főelosztó - Main Distribution) node */
export function FeNode({ id, data, selected }: NodeProps) {
  const d = data as FeNodeData;
  const canvasMode = useFlowStore((s) => s.canvasMode);
  const edges = useFlowStore((s) => s.edges);
  const nodes = useFlowStore((s) => s.nodes);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const wireMode = canvasMode === "wire";

  const connectedSides = useMemo(
    () => getConnectedSides(id, edges, nodes),
    [id, edges, nodes],
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(id);
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center border bg-white font-sans",
        "border-black",
        wireMode && "ring-1 ring-blue-400/60",
        selected && "ring-2 ring-blue-500",
      )}
      style={{ width: BOX_W, height: BOX_H }}
      onClick={handleClick}
    >
      {/* Label above */}
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap text-center text-xs font-medium leading-none text-red-600">
        {d.label}
      </div>

      {/* FE symbol: box with "E" */}
      <span className="text-xs font-bold">E</span>

      {/* Multi-line info below */}
      {(d.kmMarker || d.side || d.description) && (
        <div className="pointer-events-none absolute top-full left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap text-center text-[10px] leading-tight text-red-600">
          {d.kmMarker && <div>M1 {d.kmMarker} kmér.</div>}
          {d.side && <div>{d.side} oldal</div>}
          {d.description && <div>{d.description}</div>}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={cn("schematic-port", connectedSides.has(Position.Top) && "schematic-port--connected")}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={cn("schematic-port", connectedSides.has(Position.Bottom) && "schematic-port--connected")}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={cn("schematic-port", connectedSides.has(Position.Left) && "schematic-port--connected")}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={cn("schematic-port", connectedSides.has(Position.Right) && "schematic-port--connected")}
      />
    </div>
  );
}
