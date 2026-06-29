import { Position, type Edge, type Node } from "@xyflow/react";
import { BOX_H, BOX_W } from "@/components/flow/nodes/diagonal-cabinet-symbol";

export type LabelPlacement = "left" | "right" | "top" | "bottom";

/** Tailwind classes to position a label outside the symbol, away from wires. */
export const labelOffsetClass: Record<LabelPlacement, string> = {
  top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
};

const WIRE_BLOCKS_LABEL: Record<Position, LabelPlacement> = {
  [Position.Left]: "left",
  [Position.Right]: "right",
  [Position.Top]: "top",
  [Position.Bottom]: "bottom",
};

const PLACEMENT_PRIORITY: LabelPlacement[] = [
  "bottom",
  "right",
  "left",
  "top",
];

/** ÁSZ label prefers above the symbol. */
export const ASZ_LABEL_PRIORITY: LabelPlacement[] = [
  "top",
  "right",
  "left",
  "bottom",
];

/** FM label prefers to the right of the symbol. */
export const FM_LABEL_PRIORITY: LabelPlacement[] = [
  "right",
  "left",
  "bottom",
  "top",
];

function handleToPosition(handleId: string | null | undefined): Position | null {
  if (!handleId) return null;
  if (handleId.startsWith("top")) return Position.Top;
  if (handleId.startsWith("bottom")) return Position.Bottom;
  if (handleId.startsWith("left")) return Position.Left;
  if (handleId.startsWith("right")) return Position.Right;
  return null;
}

/** Approximate node center for wire-side inference. */
function getNodeCenter(node: Node): { x: number; y: number } {
  const position = node.position ?? { x: 0, y: 0 };

  if (node.type === "cabinet") {
    return {
      x: position.x + BOX_W / 2,
      y: position.y + BOX_H / 2,
    };
  }

  if (node.type === "asz" || node.type === "feed") {
    const w = 52;
    const h = node.type === "asz" ? 38 : 22;
    return { x: position.x + w / 2, y: position.y + h / 2 };
  }

  return { x: position.x + 40, y: position.y + 20 };
}

/** Infer which side of `self` faces the other node when handle id is missing. */
function inferSideFromNodes(self: Node, other: Node): Position {
  const a = getNodeCenter(self);
  const b = getNodeCenter(other);
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? Position.Right : Position.Left;
  }
  return dy > 0 ? Position.Bottom : Position.Top;
}

/**
 * Sides that visually have a wire going out of them, decided by the geometric
 * direction toward each connected neighbour (not the stored handle, which can
 * disagree with where the wire is actually drawn). Used for label placement so
 * the label always lands on a side with no wire when one exists.
 */
export function getOccupiedSides(
  nodeId: string,
  edges: Edge[],
  nodes: Node[],
): Set<Position> {
  const sides = new Set<Position>();
  const self = nodes.find((n) => n.id === nodeId);
  if (!self) return sides;

  for (const edge of edges) {
    let otherId: string | null = null;
    let handleId: string | null = null;

    if (edge.source === nodeId) {
      otherId = edge.target;
      handleId = edge.sourceHandle ?? null;
    } else if (edge.target === nodeId) {
      otherId = edge.source;
      handleId = edge.targetHandle ?? null;
    } else {
      continue;
    }

    const other = otherId ? nodes.find((n) => n.id === otherId) : undefined;
    if (other) {
      sides.add(inferSideFromNodes(self, other));
    } else {
      const fromHandle = handleToPosition(handleId);
      if (fromHandle) sides.add(fromHandle);
    }
  }

  return sides;
}

export function getConnectedSides(
  nodeId: string,
  edges: Edge[],
  nodes: Node[],
): Set<Position> {
  const sides = new Set<Position>();
  const self = nodes.find((n) => n.id === nodeId);

  for (const edge of edges) {
    let otherId: string | null = null;
    let handleId: string | null = null;

    if (edge.source === nodeId) {
      otherId = edge.target;
      handleId = edge.sourceHandle ?? null;
    } else if (edge.target === nodeId) {
      otherId = edge.source;
      handleId = edge.targetHandle ?? null;
    } else {
      continue;
    }

    const fromHandle = handleToPosition(handleId);
    if (fromHandle) {
      sides.add(fromHandle);
      continue;
    }

    if (!self || !otherId) continue;
    const other = nodes.find((n) => n.id === otherId);
    if (!other) continue;

    sides.add(inferSideFromNodes(self, other));
  }

  return sides;
}

/** Pick a label slot on a side with no wire attached. */
export function getLabelPlacement(
  sides: Set<Position>,
  priority: LabelPlacement[] = PLACEMENT_PRIORITY,
): LabelPlacement {
  const blocked = new Set<LabelPlacement>();
  for (const side of sides) {
    blocked.add(WIRE_BLOCKS_LABEL[side]);
  }

  for (const placement of priority) {
    if (!blocked.has(placement)) return placement;
  }

  return priority[0] ?? "bottom";
}
