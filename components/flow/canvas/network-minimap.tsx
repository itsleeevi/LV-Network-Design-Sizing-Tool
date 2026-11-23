"use client";

import {
  MiniMap,
  useReactFlow,
  useStore,
  type MiniMapNodeProps,
  type Node,
  type ReactFlowState,
  type XYPosition,
} from "@xyflow/react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  type MouseEvent,
} from "react";
import { useFlowStore } from "@/store/flow-store";
import { useElementName, useT } from "@/lib/i18n";
import { cabinetsOverDropLimit } from "@/lib/network-status";
import { getOrthogonalPath, pointsToPath } from "@/lib/wire-path";

const WIDTH = 240;
const HEIGHT = 160;

const COLOR = {
  source: "#0f172a",
  meter: "#64748b",
  cabinet: "#334155",
  overDrop: "#dc2626",
  selected: "#2563eb",
  cable: "#94a3b8",
};

/** Cabinets over the allowed voltage drop, shared with every minimap node. */
const OverDropContext = createContext<ReadonlySet<string>>(new Set());

type MinimapCable = { id: string; d: string };

function selectCables(s: ReactFlowState): MinimapCable[] {
  const center = (id: string): XYPosition | undefined => {
    const node = s.nodeLookup.get(id);
    const width = node?.measured.width;
    const height = node?.measured.height;
    if (!node || node.hidden || !width || !height) return undefined;
    const { x, y } = node.internals.positionAbsolute;
    return { x: x + width / 2, y: y + height / 2 };
  };
  const cables: MinimapCable[] = [];
  for (const edge of s.edges) {
    const from = center(edge.source);
    const to = center(edge.target);
    if (!from || !to) continue;
    cables.push({
      id: edge.id,
      d: pointsToPath(
        getOrthogonalPath(from.x, from.y, to.x, to.y, edge.sourceHandle, edge.targetHandle),
      ),
    });
  }
  return cables;
}

const sameCables = (a: MinimapCable[], b: MinimapCable[]) =>
  a.length === b.length &&
  a.every((cable, i) => cable.id === b[i].id && cable.d === b[i].d);

function CableLayer() {
  const cables = useStore(selectCables, sameCables);
  const selectedEdgeId = useFlowStore((s) => s.selectedEdgeId);
  return (
    <g pointerEvents="none">
      {cables.map((cable) => {
        const selected = cable.id === selectedEdgeId;
        return (
          <path
            key={cable.id}
            d={cable.d}
            fill="none"
            stroke={selected ? COLOR.selected : COLOR.cable}
            strokeWidth={selected ? 2.5 : 1.5}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
}

function nodeName(
  node: Node,
  elementName: ReturnType<typeof useElementName>,
): string {
  const d = node.data as { label?: string; title?: string };
  switch (node.type) {
    case "asz":
      return elementName(d.title ?? "", "asz");
    case "feed":
      return elementName(d.label || "FM", "fm");
    case "fm":
      return elementName(d.label ?? "", "fm");
    case "fe":
      return elementName(d.label ?? "", "fe");
    default:
      return elementName(d.label ?? "", "cabinet");
  }
}

/**
 * One element on the minimap. Symbols are tiny next to a whole network, so
 * each is drawn with a fixed-pixel outline (non-scaling stroke) that keeps it
 * visible at any zoom. React Flow's minimap has no edge layer, so the first
 * node in render order also draws every cable, which puts them under all the
 * symbols.
 */
const MinimapNode = memo(function MinimapNode({
  id,
  x,
  y,
  width,
  height,
  shapeRendering,
  onClick,
}: MiniMapNodeProps) {
  const node = useStore((s) => s.nodeLookup.get(id)?.internals.userNode);
  const drawsCables = useStore((s) => s.nodes[0]?.id === id);
  const selected = useFlowStore((s) => s.selectedNodeId === id);
  const overDrop = useContext(OverDropContext).has(id);
  const elementName = useElementName();
  const t = useT();
  if (!node) return null;

  const fill = overDrop
    ? COLOR.overDrop
    : node.type === "asz"
      ? COLOR.source
      : node.type === "cabinet"
        ? COLOR.cabinet
        : COLOR.meter;
  const name = nodeName(node, elementName);

  return (
    <>
      {drawsCables && <CableLayer />}
      <g
        className="cursor-pointer"
        onClick={onClick ? (event) => onClick(event, id) : undefined}
      >
        <title>{overDrop ? `${name}: ${t("minimap.overDrop")}` : name}</title>
        {/* Invisible, wider click target than the few-pixel symbol. */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="transparent"
          stroke="transparent"
          strokeWidth={16}
          vectorEffect="non-scaling-stroke"
          pointerEvents="all"
        />
        {selected && (
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="none"
            stroke={COLOR.selected}
            strokeWidth={11}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          stroke={fill}
          strokeWidth={node.type === "asz" ? 7 : 5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          shapeRendering={shapeRendering}
        />
      </g>
    </>
  );
});

/**
 * Overview of the whole network: every element and cable, the visible area
 * outlined in blue, and in red the cabinets over the allowed voltage drop in
 * the last calculation. Drag or scroll it to move the view; click an element
 * to select it and jump there, or click anywhere else to move the view there.
 */
export function NetworkMiniMap() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const { setCenter, getZoom, getInternalNode } = useReactFlow();
  const t = useT();

  const overDrop = useMemo(() => cabinetsOverDropLimit(nodes, edges), [nodes, edges]);

  const onNodeClick = useCallback(
    (event: MouseEvent, node: Node) => {
      // The map's own click handler would re-center on the pointer instead.
      event.stopPropagation();
      const internal = getInternalNode(node.id);
      if (!internal) return;
      const { x, y } = internal.internals.positionAbsolute;
      const width = internal.measured.width ?? 0;
      const height = internal.measured.height ?? 0;
      if (!useFlowStore.getState().pendingPlacement) setSelectedNodeId(node.id);
      void setCenter(x + width / 2, y + height / 2, {
        zoom: Math.max(getZoom(), 1),
        duration: 400,
      });
    },
    [getInternalNode, getZoom, setCenter, setSelectedNodeId],
  );

  const onMapClick = useCallback(
    (_: MouseEvent, position: XYPosition) => {
      void setCenter(position.x, position.y, { zoom: getZoom(), duration: 300 });
    },
    [getZoom, setCenter],
  );

  return (
    <OverDropContext.Provider value={overDrop}>
      <MiniMap
        style={{ width: WIDTH, height: HEIGHT }}
        className="overflow-hidden rounded-md border border-gray-200 shadow-sm"
        nodeComponent={MinimapNode}
        maskColor="rgba(241, 245, 249, 0.7)"
        maskStrokeColor={COLOR.selected}
        maskStrokeWidth={1.5}
        pannable
        zoomable
        onClick={onMapClick}
        onNodeClick={onNodeClick}
        ariaLabel={t("minimap.ariaLabel")}
      />
    </OverDropContext.Provider>
  );
}
