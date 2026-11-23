/**
 * Orthogonal routing of a cable between two points, shared by the canvas
 * wire (components/flow/edges/wire-edge.tsx) and the minimap so both draw a
 * cable with the same elbow.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Calculate orthogonal path points (L-shaped or straight).
 * Vertical first, then horizontal (matches schematic convention).
 */
export function getOrthogonalPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourceHandle?: string | null,
  targetHandle?: string | null
): Point[] {
  const points: Point[] = [{ x: sourceX, y: sourceY }];
  
  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(targetY - sourceY);
  
  // If nearly aligned, just draw straight line
  if (dx < 5 || dy < 5) {
    points.push({ x: targetX, y: targetY });
    return points;
  }
  
  // Determine routing based on handles or relative positions
  const goVerticalFirst = 
    sourceHandle === "bottom" || sourceHandle === "top" ||
    targetHandle === "left" || targetHandle === "right" ||
    dy > dx;
  
  if (goVerticalFirst) {
    // Go vertical first, then horizontal (L-shape: ⌐ or ⌊)
    points.push({ x: sourceX, y: targetY });
    points.push({ x: targetX, y: targetY });
  } else {
    // Go horizontal first, then vertical (L-shape: └ or ┘)
    points.push({ x: targetX, y: sourceY });
    points.push({ x: targetX, y: targetY });
  }
  
  return points;
}

/**
 * Generate SVG path from points
 */
export function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
}
