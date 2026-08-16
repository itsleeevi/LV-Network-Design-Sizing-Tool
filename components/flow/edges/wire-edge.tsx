"use client";

import { EdgeProps, EdgeLabelRenderer } from "@xyflow/react";
import type { CableEdgeData } from "@/types/electrical";
import { useFlowStore } from "@/store/flow-store";
import { getCableLabelLines } from "@/lib/cable-label";
import {
  computeCableLabelPlacements,
  CABLE_LABEL_GAP_X,
  CABLE_LABEL_GAP_Y,
} from "@/lib/cable-label-placement";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

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
 * Generate markers along the path.
 *
 * The number of labels is deterministic (driven by the caller, based on the
 * wire type) rather than derived from the pixel length, so a given kind of
 * cable always shows the same number of labels. Labels are centred in each of
 * `labelCount` equal sub-segments, and a cross tick is placed at every
 * sub-segment boundary (giving `labelCount + 1` crosses).
 */
function generatePathMarkers(
  points: Point[],
  labelCount: number
): { crosses: { point: Point; angle: number }[]; labels: { point: Point; angle: number }[] } {
  const totalLength = getPathLength(points);
  const crosses: { point: Point; angle: number }[] = [];
  const labels: { point: Point; angle: number }[] = [];

  if (labelCount < 1 || totalLength < 20) {
    return { crosses, labels };
  }

  // Lay out crosses and labels as a single evenly-spaced sequence so every
  // gap is identical: cabinet -+- ÜH-E -+- ÜH-E -+- cabinet.
  // Elements: (labelCount + 1) crosses + labelCount labels, alternating,
  // starting and ending with a cross. With N+1 gaps either side, all gaps are
  // equal at totalLength / (numElements + 1).
  const numElements = 2 * labelCount + 1;
  const step = totalLength / (numElements + 1);

  for (let k = 1; k <= numElements; k++) {
    const marker = getPointAtDistance(points, k * step);
    if (k % 2 === 1) {
      crosses.push(marker); // odd positions → cross ticks
    } else {
      labels.push(marker); // even positions → cable-type labels
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
  const t = useT();
  const cableData = data as CableEdgeData | undefined;
  const selectedEdgeId = useFlowStore((s) => s.selectedEdgeId);
  const setSelectedEdgeId = useFlowStore((s) => s.setSelectedEdgeId);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const isSelected = selected || selectedEdgeId === id;

  const language = useSettingsStore((s) => s.language);
  const labelLines = getCableLabelLines(cableData, t);

  // Placement is solved for the whole diagram at once so the boxes can be kept
  // apart; this edge just reads its own slot out of the shared result.
  const placement = useMemo(
    () => computeCableLabelPlacements(nodes, edges, language).get(id),
    [nodes, edges, language, id],
  );

  const hasInfoLabel = labelLines.length > 0;
  const strokeColor = isSelected ? "#2563eb" : "#000";
  
  // Determine cable style based on source node type
  const sourceNode = nodes.find(n => n.id === source);
  const isFromAsz = sourceNode?.type === "asz";
  const cableStyle: CableStyle = isFromAsz ? "0.4kV" : "ÜH-E";
  // Localized marking shown on the drawing (logic above stays keyed on cableStyle).
  const cableLabel = cableStyle === "0.4kV" ? t("cable.kv04") : t("cable.uhe");

  // Uniform sizing: every wire is the same standard length, so each shows a
  // single, evenly-centred cable-type label.
  const labelCount = 1;

  // Calculate orthogonal path
  const pathPoints = getOrthogonalPath(
    sourceX, sourceY,
    targetX, targetY,
    sourceHandleId,
    targetHandleId
  );
  const pathD = pointsToPath(pathPoints);
  
  // Generate markers along the path
  const { crosses, labels } = generatePathMarkers(pathPoints, labelCount);
  
  // Cross size
  const crossSize = cableStyle === "0.4kV" ? 4 : 5;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEdgeId(id);
  };

  // Apply the solved placement to the real routed path.
  const totalLength = getPathLength(pathPoints);
  const anchor = getPointAtDistance(
    pathPoints,
    totalLength * (placement?.t ?? 0.5),
  ).point;

  const infoTransform = (() => {
    switch (placement?.side) {
      case "left":
        return `translate(-100%, -50%) translate(${anchor.x - CABLE_LABEL_GAP_X}px, ${anchor.y}px)`;
      case "right":
        return `translate(0, -50%) translate(${anchor.x + CABLE_LABEL_GAP_X}px, ${anchor.y}px)`;
      case "bottom":
        return `translate(-50%, 0%) translate(${anchor.x}px, ${anchor.y + CABLE_LABEL_GAP_Y}px)`;
      default:
        return `translate(-50%, -100%) translate(${anchor.x}px, ${anchor.y - CABLE_LABEL_GAP_Y}px)`;
    }
  })();

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
      
      {/* Cable type labels — rotated to run along the cable, all same direction */}
      {labels.map((label, i) => {
        // Routing is always orthogonal, so a label sits on either a vertical
        // or a horizontal segment. Force a single orientation per case so every
        // label reads the same way regardless of which direction the cable was
        // drawn: vertical -> +90° (top-to-bottom), horizontal -> 0°.
        const absAngleDeg = Math.abs(label.angle * (180 / Math.PI));
        const isVertical = absAngleDeg > 45 && absAngleDeg < 135;
        const textAngleDeg = isVertical ? 90 : 0;
        // Size the white mask to the full text so the wire line never shows
        // through the letters (keeps the whole label readable, no breaks).
        const labelWidth = cableLabel.length * 6.5 + 8;
        return (
          <g key={`label-${i}`} transform={`translate(${label.point.x}, ${label.point.y})`}>
            <rect
              x={-labelWidth / 2}
              y={-7}
              width={labelWidth}
              height={14}
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
              style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
            >
              {cableLabel}
            </text>
          </g>
        );
      })}
      
      {/* Cable info label */}
      {hasInfoLabel && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "nodrag nopan pointer-events-none absolute whitespace-nowrap rounded bg-white px-1.5 py-1 text-[9px] leading-tight shadow-sm border border-gray-200",
              isSelected && "ring-1 ring-blue-500",
            )}
            style={{
              transform: infoTransform,
            }}
          >
            {labelLines.map((line) => (
              <div key={line.key} className={line.className}>
                {line.text}
              </div>
            ))}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
