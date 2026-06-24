import type { Node, Edge } from "@xyflow/react";

const HORIZONTAL_SPACING = 120;
const VERTICAL_SPACING = 100;

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
  
  let newCenterX: number;
  let newCenterY: number;

  switch (handleOnAnchor) {
    case "right":
      // Anchor's right handle → target should be to the RIGHT of anchor
      newCenterX = anchorCenterX + HORIZONTAL_SPACING;
      newCenterY = anchorCenterY;
      break;
    case "left":
      // Anchor's left handle → target should be to the LEFT of anchor
      newCenterX = anchorCenterX - HORIZONTAL_SPACING;
      newCenterY = anchorCenterY;
      break;
    case "bottom":
      // Anchor's bottom handle → target should be BELOW anchor
      newCenterX = anchorCenterX;
      newCenterY = anchorCenterY + VERTICAL_SPACING;
      break;
    case "top":
      // Anchor's top handle → target should be ABOVE anchor
      newCenterX = anchorCenterX;
      newCenterY = anchorCenterY - VERTICAL_SPACING;
      break;
    default:
      // Default: place below
      newCenterX = anchorCenterX;
      newCenterY = anchorCenterY + VERTICAL_SPACING;
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

  // Update edge handles for proper straight connection
  const updatedEdges = edges.map(edge => {
    if (edge.id === connectedEdge.id) {
      let newSourceHandle = edge.sourceHandle;
      let newTargetHandle = edge.targetHandle;

      // Set complementary handles based on direction
      switch (handleOnAnchor) {
        case "right":
          if (isIncoming) {
            newSourceHandle = "right";
            newTargetHandle = "left";
          } else {
            newSourceHandle = "right";
            newTargetHandle = "left";
          }
          break;
        case "left":
          if (isIncoming) {
            newSourceHandle = "left";
            newTargetHandle = "right";
          } else {
            newSourceHandle = "left";
            newTargetHandle = "right";
          }
          break;
        case "bottom":
          if (isIncoming) {
            newSourceHandle = "bottom";
            newTargetHandle = "top";
          } else {
            newSourceHandle = "bottom";
            newTargetHandle = "top";
          }
          break;
        case "top":
          if (isIncoming) {
            newSourceHandle = "top";
            newTargetHandle = "bottom";
          } else {
            newSourceHandle = "top";
            newTargetHandle = "bottom";
          }
          break;
      }

      return { ...edge, sourceHandle: newSourceHandle, targetHandle: newTargetHandle };
    }
    return edge;
  });

  return { nodes: updatedNodes, edges: updatedEdges };
}
