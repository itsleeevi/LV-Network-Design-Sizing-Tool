import { Position } from "@xyflow/react";

const PORT_W = 12;
const PORT_H = 4;

const COLORS = {
  available: { fill: "#3b82f6", stroke: "#1d4ed8" },
  connected: { fill: "#22c55e", stroke: "#15803d" },
} as const;

type SchematicBoxPortsProps = {
  width: number;
  height: number;
  wireMode: boolean;
  connectedSides: Set<Position>;
};

/** Colored port tabs on each edge — blue = available, green = wired. */
export function SchematicBoxPorts({
  width,
  height,
  wireMode,
  connectedSides,
}: SchematicBoxPortsProps) {
  if (!wireMode) return null;

  const port = (side: Position) => {
    const connected = connectedSides.has(side);
    const { fill, stroke } = connected ? COLORS.connected : COLORS.available;

    switch (side) {
      case Position.Top:
        return (
          <rect
            key="top"
            x={(width - PORT_W) / 2}
            y={-PORT_H / 2}
            width={PORT_W}
            height={PORT_H}
            fill={fill}
            stroke={stroke}
            strokeWidth={1}
            rx={0.5}
          />
        );
      case Position.Bottom:
        return (
          <rect
            key="bottom"
            x={(width - PORT_W) / 2}
            y={height - PORT_H / 2}
            width={PORT_W}
            height={PORT_H}
            fill={fill}
            stroke={stroke}
            strokeWidth={1}
            rx={0.5}
          />
        );
      case Position.Left:
        return (
          <rect
            key="left"
            x={-PORT_H / 2}
            y={(height - PORT_W) / 2}
            width={PORT_H}
            height={PORT_W}
            fill={fill}
            stroke={stroke}
            strokeWidth={1}
            rx={0.5}
          />
        );
      case Position.Right:
        return (
          <rect
            key="right"
            x={width - PORT_H / 2}
            y={(height - PORT_W) / 2}
            width={PORT_H}
            height={PORT_W}
            fill={fill}
            stroke={stroke}
            strokeWidth={1}
            rx={0.5}
          />
        );
    }
  };

  return (
    <>
      {port(Position.Top)}
      {port(Position.Bottom)}
      {port(Position.Left)}
      {port(Position.Right)}
    </>
  );
}
