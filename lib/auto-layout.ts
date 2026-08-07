import type { Node, Edge } from "@xyflow/react";

// Center-to-center gaps between a node and the one it aligns to. Sized generously
// so the wide cable info boxes (dimensions + current + drop + loop + Iz, ≈160 px)
// and the multi-line cabinet labels never collide with neighbouring boxes/labels,
// including cabinets whose label is pushed above/below because several sides are wired.
const HORIZONTAL_SPACING = 340;
const VERTICAL_SPACING = 260;

// The trunk feed and the drop to the first cabinet (ÁSZ → FM → FE → first ESZ)
// stay compact, matching the reference schematic. The wide spacing only kicks in
// between two cabinets, where the long info boxes and labels need room.
const TRUNK_HORIZONTAL_SPACING = 150;
const TRUNK_VERTICAL_SPACING = 90;

// Node dimensions (must match the actual component sizes)
const NODE_SIZES: Record<string, { width: number; height: number }> = {
  asz: { width: 52, height: 22 },
  feed: { width: 52, height: 22 },
  fm: { width: 52, height: 22 },
  fe: { width: 52, height: 22 },
  cabinet: { width: 40, height: 20 },
};

const DEFAULT_SIZE = { width: 40, height: 20 };

function getNodeSize(type: string | undefined): {
  width: number;
  height: number;
} {
  return NODE_SIZES[type || ""] || DEFAULT_SIZE;
}

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

type Direction = "right" | "left" | "top" | "bottom";

const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

const COMPLEMENT: Record<Direction, Direction> = {
  right: "left",
  left: "right",
  top: "bottom",
  bottom: "top",
};

function parseHandle(handle: string | null | undefined): Direction | null {
  if (
    handle === "right" ||
    handle === "left" ||
    handle === "top" ||
    handle === "bottom"
  ) {
    return handle;
  }
  return null;
}

function centerOf(node: Node): { x: number; y: number } {
  const size = getNodeSize(node.type);
  return {
    x: node.position.x + size.width / 2,
    y: node.position.y + size.height / 2,
  };
}

/**
 * Lay out the whole network from the source so every cable is drawn at a
 * consistent length: BFS from the ÁSZ, placing each node at a fixed
 * center-to-center distance from its parent, in the direction the connecting
 * wire leaves the parent (its handle, falling back to the current relative
 * geometry). Trunk hops (anything touching ÁSZ/FM/FE, including the drop to
 * the first cabinet) stay compact; every cabinet-to-cabinet hop uses the same
 * wide spacing. Edge handles are straightened so each wire stays a straight
 * line. Nodes not reachable from the source keep their positions.
 */
export function autoLayoutSchematic(
  nodes: Node[],
  edges: Edge[],
): LayoutResult {
  if (nodes.length === 0) return { nodes, edges };

  const root = nodes.find((n) => n.type === "asz") ?? nodes[0];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const newCenters = new Map<string, { x: number; y: number }>();
  newCenters.set(root.id, centerOf(root));

  const positionKey = (c: { x: number; y: number }) =>
    `${Math.round(c.x)},${Math.round(c.y)}`;
  const occupied = new Set<string>([positionKey(centerOf(root))]);

  const visited = new Set<string>([root.id]);
  const queue: string[] = [root.id];
  const edgeHandleFixes = new Map<
    string,
    { sourceHandle: string; targetHandle: string }
  >();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = nodeById.get(currentId)!;
    const currentCenter = newCenters.get(currentId)!;

    for (const edge of edges) {
      let childId: string;
      let handleOnCurrent: string | null | undefined;
      let currentIsSource: boolean;

      if (edge.source === currentId) {
        childId = edge.target;
        handleOnCurrent = edge.sourceHandle;
        currentIsSource = true;
      } else if (edge.target === currentId) {
        childId = edge.source;
        handleOnCurrent = edge.targetHandle;
        currentIsSource = false;
      } else {
        continue;
      }

      if (visited.has(childId)) continue;
      const child = nodeById.get(childId);
      if (!child) continue;
      visited.add(childId);

      // Direction the wire leaves the current node: its handle, or the
      // current relative geometry when the handle is missing, so the layout
      // keeps the shape the user drew.
      let direction = parseHandle(handleOnCurrent);
      if (!direction) {
        const a = centerOf(current);
        const b = centerOf(child);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        direction =
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0
              ? "right"
              : "left"
            : dy > 0
              ? "bottom"
              : "top";
      }

      const bothCabinets =
        current.type === "cabinet" && child.type === "cabinet";
      const isHorizontal = direction === "left" || direction === "right";
      const spacing = isHorizontal
        ? bothCabinets
          ? HORIZONTAL_SPACING
          : TRUNK_HORIZONTAL_SPACING
        : bothCabinets
          ? VERTICAL_SPACING
          : TRUNK_VERTICAL_SPACING;

      const vector = DIRECTION_VECTORS[direction];
      const center = {
        x: currentCenter.x + vector.x * spacing,
        y: currentCenter.y + vector.y * spacing,
      };
      // Two children leaving the same side would land on the same spot; step
      // the later one further out in the same direction until the slot is free.
      while (occupied.has(positionKey(center))) {
        center.x += vector.x * spacing;
        center.y += vector.y * spacing;
      }
      occupied.add(positionKey(center));
      newCenters.set(childId, center);

      // Straighten the wire: the child's handle faces back toward the parent.
      const childHandle = COMPLEMENT[direction];
      edgeHandleFixes.set(
        edge.id,
        currentIsSource
          ? { sourceHandle: direction, targetHandle: childHandle }
          : { sourceHandle: childHandle, targetHandle: direction },
      );

      queue.push(childId);
    }
  }

  const updatedNodes = nodes.map((node) => {
    const center = newCenters.get(node.id);
    if (!center || node.id === root.id) return node;
    const size = getNodeSize(node.type);
    return {
      ...node,
      position: {
        x: center.x - size.width / 2,
        y: center.y - size.height / 2,
      },
    };
  });

  const updatedEdges = edges.map((edge) => {
    const fix = edgeHandleFixes.get(edge.id);
    return fix ? { ...edge, ...fix } : edge;
  });

  return { nodes: updatedNodes, edges: updatedEdges };
}
