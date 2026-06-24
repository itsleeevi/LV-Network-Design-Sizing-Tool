import { Position } from "@xyflow/react";
import { SchematicBoxPorts } from "./schematic-box-ports";

export const BOX_W = 40;
export const BOX_H = 20;

type DiagonalCabinetSymbolProps = {
  wireMode?: boolean;
  connectedSides?: Set<Position>;
};

/** Schematic cabinet: bottom-left black / top-right white; ports highlight in wire mode. */
export function DiagonalCabinetSymbol({
  wireMode = false,
  connectedSides = new Set(),
}: DiagonalCabinetSymbolProps) {
  const borderStroke = wireMode ? "#2563eb" : "#000";

  return (
    <svg
      width={BOX_W}
      height={BOX_H}
      viewBox={`0 0 ${BOX_W} ${BOX_H}`}
      className="block shrink-0"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <polygon points={`-0.5,0 -0.5,${BOX_H} ${BOX_W},${BOX_H}`} fill="#000" />
      <polygon points={`0,0 ${BOX_W},0 ${BOX_W},${BOX_H}`} fill="#fff" />

      <rect
        x={0}
        y={0}
        width={BOX_W}
        height={BOX_H}
        fill="none"
        stroke={borderStroke}
        strokeWidth={wireMode ? 1.5 : 1}
      />

      <SchematicBoxPorts
        width={BOX_W}
        height={BOX_H}
        wireMode={wireMode}
        connectedSides={connectedSides}
      />
    </svg>
  );
}
