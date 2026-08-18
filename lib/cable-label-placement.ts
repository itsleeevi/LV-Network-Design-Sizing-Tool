import type { Edge, Node } from "@xyflow/react";
import type { CableEdgeData } from "@/types/electrical";
import { BOX_H, BOX_W } from "@/components/flow/nodes/diagonal-cabinet-symbol";
import { getNodeLabelSides } from "@/lib/cabinet-label-placement";
import { estimateCableLabelSize, getCableLabelLines } from "@/lib/cable-label";
import { translate } from "@/lib/i18n";
import type { Language } from "@/store/settings-store";

export type CableLabelSide = "left" | "right" | "top" | "bottom";

/** Where a cable's info box goes: which side of the cable, and how far along. */
export type CableLabelPlacement = {
  side: CableLabelSide;
  /** Fraction along the cable path, 0 = source end, 1 = target end. */
  t: number;
};

/** Gap between the cable and its info box; mirrors the rendered offsets. */
export const CABLE_LABEL_GAP_X = 10;
export const CABLE_LABEL_GAP_Y = 8;

type Rect = { x: number; y: number; w: number; h: number };
type Size = { width: number; height: number };

/** Positions tried along the cable, nearest the middle first. */
const T_CANDIDATES = [0.5, 0.38, 0.62, 0.28, 0.72, 0.18, 0.82];

/** Small buffer kept clear around every box so labels never touch. */
const MARGIN = 3;

/** Rough footprint of a node's own text label, kept clear of cable boxes. */
const NODE_LABEL_W = 108;
const NODE_LABEL_H = 74;

function overlapArea(a: Rect, b: Rect): number {
  // Inflated by MARGIN on both sides so boxes keep a visible gap rather than
  // just barely not touching.
  const ax = a.x - MARGIN;
  const ay = a.y - MARGIN;
  const aw = a.w + 2 * MARGIN;
  const ah = a.h + 2 * MARGIN;
  const dx = Math.min(ax + aw, b.x + b.w) - Math.max(ax, b.x);
  const dy = Math.min(ay + ah, b.y + b.h) - Math.max(ay, b.y);
  return dx > 0 && dy > 0 ? dx * dy : 0;
}

function nodeSize(node: Node): Size {
  switch (node.type) {
    case "cabinet":
      return { width: BOX_W, height: BOX_H };
    case "asz":
      return { width: 52, height: 38 };
    case "feed":
      return { width: 52, height: 22 };
    default:
      return { width: 80, height: 40 };
  }
}

function nodeRect(node: Node): Rect {
  const { width, height } = nodeSize(node);
  const p = node.position ?? { x: 0, y: 0 };
  return { x: p.x, y: p.y, w: width, h: height };
}

function nodeCenter(node: Node): { x: number; y: number } {
  const r = nodeRect(node);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Box a node's own label occupies, on whichever side the node put it. */
function nodeLabelRects(node: Node, edges: Edge[], nodes: Node[]): Rect[] {
  const r = nodeRect(node);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;

  return [...getNodeLabelSides(node, edges, nodes)].map((side) => {
    switch (side) {
      case "left":
        return { x: r.x - NODE_LABEL_W, y: cy - NODE_LABEL_H / 2, w: NODE_LABEL_W, h: NODE_LABEL_H };
      case "right":
        return { x: r.x + r.w, y: cy - NODE_LABEL_H / 2, w: NODE_LABEL_W, h: NODE_LABEL_H };
      case "top":
        return { x: cx - NODE_LABEL_W / 2, y: r.y - NODE_LABEL_H, w: NODE_LABEL_W, h: NODE_LABEL_H };
      case "bottom":
      default:
        return { x: cx - NODE_LABEL_W / 2, y: r.y + r.h, w: NODE_LABEL_W, h: NODE_LABEL_H };
    }
  });
}

function candidateRect(
  point: { x: number; y: number },
  side: CableLabelSide,
  size: Size,
): Rect {
  const { width: w, height: h } = size;
  switch (side) {
    case "right":
      return { x: point.x + CABLE_LABEL_GAP_X, y: point.y - h / 2, w, h };
    case "left":
      return { x: point.x - CABLE_LABEL_GAP_X - w, y: point.y - h / 2, w, h };
    case "bottom":
      return { x: point.x - w / 2, y: point.y + CABLE_LABEL_GAP_Y, w, h };
    case "top":
    default:
      return { x: point.x - w / 2, y: point.y - CABLE_LABEL_GAP_Y - h, w, h };
  }
}

/**
 * Decide where every cable's info box goes so the boxes miss each other, the
 * node symbols, and the nodes' own labels.
 *
 * Each wire renders on its own, so the choice has to be identical no matter
 * which wire asks for it: the assignment is computed for the whole diagram in
 * one deterministic pass (most constrained cable first, ties broken by id) and
 * every wire then looks up its own entry.
 *
 * Cable geometry is approximated by the straight line between the two node
 * centres. That only picks the side and the position along the cable; the wire
 * component applies that choice to the real routed path, so an L-shaped cable
 * still gets a correctly placed box.
 */
function solveCableLabelPlacements(
  nodes: Node[],
  edges: Edge[],
  language: Language,
): Map<string, CableLabelPlacement> {
  const labelSize = (edge: Edge): Size =>
    estimateCableLabelSize(
      getCableLabelLines(
        edge.data as CableEdgeData | undefined,
        (key) => translate(language, key),
        language,
      ),
    );

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const placements = new Map<string, CableLabelPlacement>();

  // Everything a cable box has to dodge. Cable boxes join as they are placed.
  const blockers: Rect[] = [];
  for (const node of nodes) {
    blockers.push(nodeRect(node));
    blockers.push(...nodeLabelRects(node, edges, nodes));
  }

  const sized = edges
    .map((edge) => {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target) return null;
      const size = labelSize(edge);
      if (size.width <= 0 || size.height <= 0) return null;

      const a = nodeCenter(source);
      const b = nodeCenter(target);
      const span = Math.hypot(b.x - a.x, b.y - a.y);
      if (span < 1) return null;

      return { edge, source, target, size, a, b, span };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  // Short cables sit in the crowded junctions and have the least room, so they
  // get first pick of the free space.
  sized.sort((p, q) => p.span - q.span || p.edge.id.localeCompare(q.edge.id));

  for (const { edge, source, target, size, a, b } of sized) {
    const isVertical = Math.abs(b.y - a.y) >= Math.abs(b.x - a.x);
    const endpointLabelSides = new Set([
      ...getNodeLabelSides(source, edges, nodes),
      ...getNodeLabelSides(target, edges, nodes),
    ]);

    // Beside a vertical cable, above/below a horizontal one; the perpendicular
    // sides are tried too as a fallback for crowded junctions where the
    // preferred axis has no clear spot. The side the endpoints' own labels do
    // not already use comes first within each pair.
    const sides: CableLabelSide[] = isVertical
      ? ["right", "left", "bottom", "top"]
      : ["bottom", "top", "right", "left"];
    sides.sort(
      (s1, s2) =>
        Number(endpointLabelSides.has(s1)) - Number(endpointLabelSides.has(s2)),
    );

    let best: { placement: CableLabelPlacement; rect: Rect; score: number } | null =
      null;

    outer: for (const [sideRank, side] of sides.entries()) {
      for (const t of T_CANDIDATES) {
        const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        const rect = candidateRect(point, side, size);
        const overlap = blockers.reduce((sum, r) => sum + overlapArea(rect, r), 0);
        const score =
          overlap + sideRank * 25 + Math.abs(t - 0.5) * 120;

        if (!best || score < best.score) {
          best = { placement: { side, t }, rect, score };
        }
        if (overlap === 0) break outer; // clear spot on the preferred side
      }
    }

    if (!best) continue;
    placements.set(edge.id, best.placement);
    blockers.push(best.rect);
  }

  return placements;
}

/**
 * Every wire asks for the diagram-wide solution during the same render pass,
 * so the last result is reused whenever the inputs are unchanged. Without this
 * the shared pass would be recomputed once per wire on every render.
 */
let cache:
  | {
      nodes: Node[];
      edges: Edge[];
      language: Language;
      result: Map<string, CableLabelPlacement>;
    }
  | null = null;

export function computeCableLabelPlacements(
  nodes: Node[],
  edges: Edge[],
  language: Language,
): Map<string, CableLabelPlacement> {
  if (
    cache &&
    cache.nodes === nodes &&
    cache.edges === edges &&
    cache.language === language
  ) {
    return cache.result;
  }

  const result = solveCableLabelPlacements(nodes, edges, language);
  cache = { nodes, edges, language, result };
  return result;
}
