"use client";

import { EdgeProps, EdgeLabelRenderer } from "@xyflow/react";
import type { CableEdgeData } from "@/types/electrical";
import { useFlowStore } from "@/store/flow-store";
import { cn } from "@/lib/utils";

const STROKE_WIDTH = 1;

type CableStyle = "0.4kV" | "ÜH-E";

interface Point {
  x: number;
  y: number;
}

/**
 * Calculate orthogonal path points (L-shaped or straight).
 * Vertical first, then horizontal (matches schematic convention).
 */
function getOrthogonalPath(
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
function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
}

/**
 * Calculate total length of path
 */
function getPathLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

/**
 * Get position at distance along path
 */
function getPointAtDistance(points: Point[], distance: number): { point: Point; angle: number } {
  let accumulated = 0;
  
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    
    if (accumulated + segmentLength >= distance) {
      const t = (distance - accumulated) / segmentLength;
      return {
        point: {
          x: points[i - 1].x + dx * t,
          y: points[i - 1].y + dy * t,
        },
        angle: Math.atan2(dy, dx),
      };
    }
    accumulated += segmentLength;
  }
  
  // Return last point
  const lastIdx = points.length - 1;
  const dx = points[lastIdx].x - points[lastIdx - 1].x;
  const dy = points[lastIdx].y - points[lastIdx - 1].y;
  return {
    point: points[lastIdx],
    angle: Math.atan2(dy, dx),
  };
}

/**
 * Generate markers along the path
 */
function generatePathMarkers(
  points: Point[],
  segmentSpacing: number = 50
): { crosses: { point: Point; angle: number }[]; labels: { point: Point; angle: number }[] } {
  const totalLength = getPathLength(points);
  const crosses: { point: Point; angle: number }[] = [];
  const labels: { point: Point; angle: number }[] = [];
  
  if (totalLength < 30) {
    return { crosses, labels };
  }
  
  const margin = 12;
  const usableLength = totalLength - 2 * margin;
  const numSegments = Math.max(1, Math.floor(usableLength / segmentSpacing));
  const actualSpacing = usableLength / numSegments;
  
  for (let i = 0; i <= numSegments; i++) {
    const crossDist = margin + i * actualSpacing;
    if (crossDist > margin && crossDist < totalLength - margin) {
      crosses.push(getPointAtDistance(points, crossDist));
    }
    
    if (i < numSegments) {
      const labelDist = margin + (i + 0.5) * actualSpacing;
      if (labelDist > margin * 2 && labelDist < totalLength - margin * 2) {
        labels.push(getPointAtDistance(points, labelDist));
      }
    }
  }
  
  return { crosses, labels };
}

/** 
 * Underground cable edge with orthogonal routing and Hungarian notation.
 */
export function WireEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  source,
  sourceHandleId,
  targetHandleId,
  data,
  selected,
}: EdgeProps) {
  const cableData = data as CableEdgeData | undefined;
  const selectedEdgeId = useFlowStore((s) => s.selectedEdgeId);
  const setSelectedEdgeId = useFlowStore((s) => s.setSelectedEdgeId);
  const nodes = useFlowStore((s) => s.nodes);
  const isSelected = selected || selectedEdgeId === id;

  const hasInfoLabel = cableData && cableData.length > 0;
  const strokeColor = isSelected ? "#2563eb" : "#000";
  
  // Determine cable style based on source node type
  const sourceNode = nodes.find(n => n.id === source);
  const isFromAsz = sourceNode?.type === "asz";
  const cableStyle: CableStyle = isFromAsz ? "0.4kV" : "ÜH-E";
  
  // Calculate orthogonal path
  const pathPoints = getOrthogonalPath(
    sourceX, sourceY,
    targetX, targetY,
    sourceHandleId,
    targetHandleId
  );
  const pathD = pointsToPath(pathPoints);
  
  // Generate markers along the path
  const { crosses, labels } = generatePathMarkers(pathPoints);
  
  // Cross size
  const crossSize = cableStyle === "0.4kV" ? 4 : 5;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEdgeId(id);
  };

  // Calculate label position (middle of path)
  const totalLength = getPathLength(pathPoints);
  const labelPos = getPointAtDistance(pathPoints, totalLength / 2);

  return (
    <>
      {/* Main cable path */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isSelected ? 1.5 : STROKE_WIDTH}
        className="react-flow__edge-path"
        style={{ cursor: "pointer" }}
        onClick={handleClick}
      />
      
      {/* Invisible wider hit area */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ cursor: "pointer" }}
        onClick={handleClick}
      />
      
      {/* Cross marks */}
      {crosses.map((cross, i) => {
        const perpAngle = cross.angle + Math.PI / 2;
        return (
          <g key={`cross-${i}`}>
            {/* Perpendicular bar */}
            <line
              x1={cross.point.x - Math.cos(perpAngle) * crossSize}
              y1={cross.point.y - Math.sin(perpAngle) * crossSize}
              x2={cross.point.x + Math.cos(perpAngle) * crossSize}
              y2={cross.point.y + Math.sin(perpAngle) * crossSize}
              stroke={strokeColor}
              strokeWidth={isSelected ? 1.5 : STROKE_WIDTH}
            />
            {cableStyle === "0.4kV" && (
              /* Parallel bar for + style */
              <line
                x1={cross.point.x - Math.cos(cross.angle) * crossSize}
                y1={cross.point.y - Math.sin(cross.angle) * crossSize}
                x2={cross.point.x + Math.cos(cross.angle) * crossSize}
                y2={cross.point.y + Math.sin(cross.angle) * crossSize}
                stroke={strokeColor}
                strokeWidth={isSelected ? 1.5 : STROKE_WIDTH}
              />
            )}
          </g>
        );
      })}
      
      {/* Cable type labels */}
      {labels.map((label, i) => {
        let textAngleDeg = label.angle * (180 / Math.PI);
        if (textAngleDeg > 90 || textAngleDeg < -90) {
          textAngleDeg += 180;
        }
        return (
          <g key={`label-${i}`} transform={`translate(${label.point.x}, ${label.point.y})`}>
            <rect
              x={-18}
              y={-6}
              width={36}
              height={12}
              fill="white"
              transform={`rotate(${textAngleDeg})`}
            />
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fontFamily="Arial, sans-serif"
              fill={strokeColor}
              transform={`rotate(${textAngleDeg})`}
              style={{ pointerEvents: "none" }}
            >
              {cableStyle}
            </text>
          </g>
        );
      })}
      
      {/* Cable info label */}
      {hasInfoLabel && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "nodrag nopan pointer-events-none absolute rounded bg-white px-1.5 py-1 text-[9px] leading-tight shadow-sm border border-gray-200",
              isSelected && "ring-1 ring-blue-500",
            )}
            style={{
              transform: `translate(-50%, 0) translate(${labelPos.point.x}px, ${labelPos.point.y + 15}px)`,
            }}
          >
            <div className="font-medium">{cableData.length} m • {cableData.crossSection} mm²</div>
            {cableData.current !== undefined && cableData.current > 0 && (
              <div className="font-medium text-blue-600">Áram: {cableData.current.toFixed(2)} A</div>
            )}
            {cableData.voltageDropV !== undefined && cableData.voltageDropV > 0 && (
              <div className="font-medium text-blue-600">
                Fesz esés: {cableData.voltageDropV.toFixed(2)} V ({cableData.voltageDropPercent?.toFixed(2)}%)
              </div>
            )}
            {cableData.impedance !== undefined && cableData.impedance > 0 && (
              <div className="font-medium text-blue-600">Hurok IMP: {cableData.impedance.toFixed(3)} Ω</div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
