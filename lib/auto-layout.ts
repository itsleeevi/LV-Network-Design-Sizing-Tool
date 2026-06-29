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

function getNodeSize(type: string | undefined): { width: number; height: number } {
  return NODE_SIZES[type || ""] || DEFAULT_SIZE;
}

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Align only the selected node based on its wire connection.
 * Handles both incoming (target) and outgoing (source) connections.
 */
export function autoLayoutSchematic(
  nodes: Node[],
  edges: Edge[],
  selectedNodeId?: string | null
): LayoutResult {
  if (nodes.length === 0) return { nodes, edges };

  // Find the node to align
  let targetNodeId = selectedNodeId;
  
  if (!targetNodeId) {
    const cabinets = nodes.filter(n => n.type === "cabinet");
    if (cabinets.length > 0) {
      targetNodeId = cabinets[cabinets.length - 1].id;
    }
  }
  
  if (!targetNodeId) {
    return { nodes, edges };
  }

  const targetNode = nodes.find(n => n.id === targetNodeId);
  if (!targetNode) {
    return { nodes, edges };
  }

  // Find any edge connected to this node (incoming or outgoing)
  const incomingEdge = edges.find(e => e.target === targetNodeId);
  const outgoingEdge = edges.find(e => e.source === targetNodeId);
  
  // Prefer incoming edge, but use outgoing if no incoming
  const connectedEdge = incomingEdge || outgoingEdge;
  if (!connectedEdge) {
    return { nodes, edges };
  }

  // Determine which node is the "anchor" (the one we align to)
  const isIncoming = connectedEdge.target === targetNodeId;
  const anchorNodeId = isIncoming ? connectedEdge.source : connectedEdge.target;
  const anchorNode = nodes.find(n => n.id === anchorNodeId);
  
  if (!anchorNode) {
    return { nodes, edges };
  }

  const anchorSize = getNodeSize(anchorNode.type);
  const targetSize = getNodeSize(targetNode.type);

  // Calculate center of anchor node
  const anchorCenterX = anchorNode.position.x + anchorSize.width / 2;
  const anchorCenterY = anchorNode.position.y + anchorSize.height / 2;

  // Determine the connection direction
  // For incoming edge: use sourceHandle (where the wire comes FROM on the anchor)
  // For outgoing edge: use targetHandle (where the wire goes TO on the anchor)
  const handleOnAnchor = isIncoming ? connectedEdge.sourceHandle : connectedEdge.targetHandle;

  // Only cabinet-to-cabinet hops use the wide uniform spacing. Anything touching
  // the trunk (ÁSZ/FM/FE), including the drop to the first cabinet, stays compact.
  const bothCabinets =
    targetNode.type === "cabinet" && anchorNode.type === "cabinet";
  const hSpacing = bothCabinets ? HORIZONTAL_SPACING : TRUNK_HORIZONTAL_SPACING;
  const vSpacing = bothCabinets ? VERTICAL_SPACING : TRUNK_VERTICAL_SPACING;

  let newCenterX: number;
  let newCenterY: number;

  switch (handleOnAnchor) {
    case "right":
      // Anchor's right handle → target should be to the RIGHT of anchor
      newCenterX = anchorCenterX + hSpacing;
      newCenterY = anchorCenterY;
      break;
    case "left":
      // Anchor's left handle → target should be to the LEFT of anchor
      newCenterX = anchorCenterX - hSpacing;
      newCenterY = anchorCenterY;
      break;
    case "bottom":
      // Anchor's bottom handle → target should be BELOW anchor
      newCenterX = anchorCenterX;
      newCenterY = anchorCenterY + vSpacing;
      break;
    case "top":
      // Anchor's top handle → target should be ABOVE anchor
      newCenterX = anchorCenterX;
      newCenterY = anchorCenterY - vSpacing;
      break;
    default:
      // Default: place below
      newCenterX = anchorCenterX;
      newCenterY = anchorCenterY + vSpacing;
  }

  // Convert center position to top-left position
  const newPos = {
    x: newCenterX - targetSize.width / 2,
    y: newCenterY - targetSize.height / 2,
  };

  // Update only the target node's position
  const updatedNodes = nodes.map(node => {
    if (node.id === targetNodeId) {
      return { ...node, position: newPos };
    }
    return node;
  });

  // Update edge handles for a straight connection.
  //
  // IMPORTANT: keep the ANCHOR's handle exactly as it was — it is what
  // `handleOnAnchor` reads to decide the direction. Only the moved node gets the
  // complementary handle. Previously the anchor's own handle was flipped to the
  // complement in the outgoing-edge case, so `handleOnAnchor` alternated on every
  // click and the node bounced left/right (or up/down) between presses.
  const complement: Record<string, string> = {
    right: "left",
    left: "right",
    top: "bottom",
    bottom: "top",
  };
  const anchorHandle = handleOnAnchor ?? "bottom";
  const movedHandle = complement[anchorHandle] ?? "top";

  const updatedEdges = edges.map(edge => {
    if (edge.id !== connectedEdge.id) return edge;

    // isIncoming → anchor is the edge SOURCE, moved node is the TARGET.
    // outgoing  → anchor is the edge TARGET, moved node is the SOURCE.
    return isIncoming
      ? { ...edge, sourceHandle: anchorHandle, targetHandle: movedHandle }
      : { ...edge, sourceHandle: movedHandle, targetHandle: anchorHandle };
  });

  return { nodes: updatedNodes, edges: updatedEdges };
}
