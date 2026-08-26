import type { Node, Edge } from "@xyflow/react";
import type {
  CabinetNodeData,
  CableEdgeData,
  AszNodeData,
  Device,
  PhaseMode,
} from "@/types/electrical";
import {
  CABLE_RESISTIVITY,
  CABLE_CROSS_SECTIONS,
  DESIGN_CURRENT_SAFETY_FACTOR,
  DEFAULT_MAX_CURRENT_DENSITY_A_PER_MM2,
  FUSE_CURRENT_DIVISOR,
} from "@/types/electrical";

const SORTED_CROSS_SECTIONS: number[] = [...CABLE_CROSS_SECTIONS].sort(
  (a, b) => a - b,
);
const SMALLEST_CROSS_SECTION = SORTED_CROSS_SECTIONS[0];

/**
 * Round required cross-section up to the next standard cable size [mm²].
 * Returns the largest standard value when required exceeds all standards.
 */
export function nextStandardCrossSection(required: number): number {
  return (
    SORTED_CROSS_SECTIONS.find((s) => s >= required) ??
    SORTED_CROSS_SECTIONS[SORTED_CROSS_SECTIONS.length - 1]
  );
}

/**
 * Continuous thermal minimum cross-section [mm²] from a current-density floor.
 * Returns 0 when density is disabled (<= 0) or there is no current.
 */
export function calculateThermalMinCrossSection(
  current: number,
  maxCurrentDensityAPerMm2: number,
): number {
  if (maxCurrentDensityAPerMm2 <= 0 || current <= 0) return 0;
  return current / maxCurrentDensityAPerMm2;
}

/**
 * How many identical cables share this segment. Missing / invalid values mean
 * a single cable (matches saved projects that predate the field).
 */
export function resolveParallelCount(parallelCount: number | undefined): number {
  if (parallelCount == null || !Number.isFinite(parallelCount) || parallelCount < 1) {
    return 1;
  }
  return Math.floor(parallelCount);
}

/** Effective conductor area [mm²] of n parallel runs of cross-section A. */
export function effectiveCrossSection(
  crossSection: number,
  parallelCount: number | undefined,
): number {
  return crossSection * resolveParallelCount(parallelCount);
}

const SQRT3 = Math.sqrt(3);
const PHASE_VOLTAGE = 230; // V (phase-to-neutral), drives the short-circuit current
const RHO = CABLE_RESISTIVITY;

/**
 * Calculate loop impedance [Ω]
 * Rh = 2 × ρ × L / A (go + return path).
 * Identical in both phase modes (Excel "1. körzet" P column).
 */
export function calculateLoopImpedance(
  length: number,
  crossSection: number,
): number {
  if (crossSection <= 0 || length <= 0) return 0;
  return (2 * RHO * length) / crossSection;
}

/**
 * Calculate voltage drop [V] for a single cable segment.
 * - 3F (three-phase):  ΔU = √3 × ρ × L × I / A
 * - 1F (single-phase): ΔU = ρ × L × I / A   (one conductor; the Excel "1F" O column)
 */
export function calculateVoltageDropV(
  length: number,
  crossSection: number,
  current: number,
  phaseMode: PhaseMode = "3F",
): number {
  if (crossSection <= 0 || current <= 0 || length <= 0) return 0;
  const factor = phaseMode === "3F" ? SQRT3 : 1;
  return (factor * RHO * length * current) / crossSection;
}

/**
 * Calculate voltage drop percentage.
 * - 3F: ΔU% = ΔU / U × 100               (U = line voltage, e.g. 400 V)
 * - 1F: ΔU% = ΔU × 2 / U × 100           (×2 for the line + neutral conductors; U = 230 V)
 */
export function calculateVoltageDropPercent(
  voltageDropV: number,
  systemVoltage: number,
  phaseMode: PhaseMode = "3F",
): number {
  if (systemVoltage <= 0) return 0;
  const conductorFactor = phaseMode === "3F" ? 1 : 2;
  return (voltageDropV * conductorFactor * 100) / systemVoltage;
}

/**
 * Calculate the allowed voltage drop [V] used for sizing the minimum cross-section.
 * - 3F: é = 0.75 × U × ε / √3   (≡ U × ε × √3 / 4; the Excel "3F" J column, U = 400 V)
 * - 1F: é = U × ε / 2           (the Excel "1F" K column, U = 230 V)
 */
export function calculateAllowedVoltageDropV(
  systemVoltage: number,
  allowedPercent: number,
  phaseMode: PhaseMode = "3F",
): number {
  const eps = allowedPercent / 100;
  if (phaseMode === "1F") {
    return (systemVoltage * eps) / 2;
  }
  return (0.75 * systemVoltage * eps) / SQRT3;
}

/**
 * Calculate required minimum cross-section [mm²]
 * A_min = (ρ × L × I) / ΔU_allowed
 */
export function calculateMinCrossSection(
  length: number,
  current: number,
  allowedVoltageDropV: number,
): number {
  if (allowedVoltageDropV <= 0 || current <= 0 || length <= 0) return 0;
  return (RHO * length * current) / allowedVoltageDropV;
}

/**
 * Calculate short-circuit current [A]
 * Iz = 230V / Rh (using phase voltage)
 */
export function calculateShortCircuitCurrent(loopImpedance: number): number {
  if (loopImpedance <= 0) return 0;
  return PHASE_VOLTAGE / loopImpedance;
}

/**
 * Suggested maximum fuse rating [A] (Excel summary block "Bizt" row, e.g.
 * `+U6/8`): a rule-of-thumb ceiling so the fuse still trips reliably on a
 * fault this far from the source.
 */
export function calculateMaxFuseRating(shortCircuitCurrent: number): number {
  if (shortCircuitCurrent <= 0) return 0;
  return shortCircuitCurrent / FUSE_CURRENT_DIVISOR;
}

/** Build adjacency list from edges */
function buildAdjacencyList(
  edges: Edge[],
): Map<string, { nodeId: string; edgeId: string }[]> {
  const adj = new Map<string, { nodeId: string; edgeId: string }[]>();

  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);

    adj.get(edge.source)!.push({ nodeId: edge.target, edgeId: edge.id });
    adj.get(edge.target)!.push({ nodeId: edge.source, edgeId: edge.id });
  }

  return adj;
}

/** Find the ASZ (source) node */
function findSourceNode(nodes: Node[]): Node | undefined {
  return nodes.find((n) => n.type === "asz");
}

/** Sum of device currents in a cabinet */
function sumDeviceCurrents(devices: Device[]): number {
  return devices.reduce((sum, d) => sum + (d.current || 0), 0);
}

/** Run all calculations and update node/edge data */
export function runCalculations(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const sourceNode = findSourceNode(nodes);
  if (!sourceNode) return { nodes, edges };

  const sourceData = sourceNode.data as AszNodeData;
  const phaseMode: PhaseMode = sourceData.phaseMode ?? "3F";
  const systemVoltage = sourceData.voltage || (phaseMode === "1F" ? 230 : 400);
  const allowedDropPercent = sourceData.allowedVoltageDrop || 4;
  const allowedDropV = calculateAllowedVoltageDropV(
    systemVoltage,
    allowedDropPercent,
    phaseMode,
  );
  // Design-current mode ("mértékadó áram", Rack workbook G column, e.g.
  // `+G24*(1.2)/3`): each cable carries the downstream raw device total
  // scaled by the safety factor and split across the phases. The 1F case has
  // no Excel reference; a single phase carries everything, so only the
  // safety factor applies.
  const safetyFactor =
    sourceData.designCurrentSafetyFactor ?? DESIGN_CURRENT_SAFETY_FACTOR;
  const designCurrentFactor = sourceData.useDesignCurrent
    ? safetyFactor / (phaseMode === "3F" ? 3 : 1)
    : 1;

  const adj = buildAdjacencyList(edges);

  const ownCurrents = new Map<string, number>();
  for (const node of nodes) {
    if (node.type === "cabinet") {
      const data = node.data as CabinetNodeData;
      ownCurrents.set(node.id, sumDeviceCurrents(data.devices || []));
    } else {
      ownCurrents.set(node.id, 0);
    }
  }

  const visited = new Set<string>();
  const parent = new Map<string, string | null>();
  const children = new Map<string, string[]>();
  const edgeToChild = new Map<string, string>();

  const queue: string[] = [sourceNode.id];
  visited.add(sourceNode.id);
  parent.set(sourceNode.id, null);
  children.set(sourceNode.id, []);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const neighbors = adj.get(nodeId) || [];

    for (const { nodeId: neighborId, edgeId } of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        parent.set(neighborId, nodeId);
        edgeToChild.set(neighborId, edgeId);
        if (!children.has(nodeId)) children.set(nodeId, []);
        children.get(nodeId)!.push(neighborId);
        children.set(neighborId, []);
        queue.push(neighborId);
      }
    }
  }

  const totalCurrents = new Map<string, number>();
  const postOrder: string[] = [];

  function dfs(nodeId: string) {
    for (const childId of children.get(nodeId) || []) {
      dfs(childId);
    }
    postOrder.push(nodeId);
  }
  dfs(sourceNode.id);

  for (const nodeId of postOrder) {
    let total = ownCurrents.get(nodeId) || 0;
    for (const childId of children.get(nodeId) || []) {
      total += totalCurrents.get(childId) || 0;
    }
    totalCurrents.set(nodeId, total);
  }

  const cumulativeVoltageDrop = new Map<string, number>();
  cumulativeVoltageDrop.set(sourceNode.id, 0);

  // Cumulative voltage drop in volts, summed the same way as the percentage
  // (Excel "1. körzet" summary block "Fesz esés" row, e.g. `+N10+N29+N42`).
  const cumulativeVoltageDropV = new Map<string, number>();
  cumulativeVoltageDropV.set(sourceNode.id, 0);

  // Accumulated loop impedance from the source down to each node, matching
  // the Excel "1. körzet" summary block ("Hurok IMP" row: the sum of the
  // per-cable Rh column along the path back to the source).
  const cumulativeImpedance = new Map<string, number>();
  cumulativeImpedance.set(sourceNode.id, 0);

  const edgeDataMap = new Map<string, Partial<CableEdgeData>>();

  /** Per-cable inputs the cross-section recommendation pass needs. */
  const edgeLoads = new Map<
    string,
    {
      length: number;
      current: number;
      requiredCrossSection: number;
      parallelCount: number;
      allowedVoltageDropV: number;
    }
  >();

  const preOrder: string[] = [];
  function dfsPreOrder(nodeId: string) {
    preOrder.push(nodeId);
    for (const childId of children.get(nodeId) || []) {
      dfsPreOrder(childId);
    }
  }
  dfsPreOrder(sourceNode.id);

  for (const nodeId of preOrder) {
    if (nodeId === sourceNode.id) continue;

    const parentId = parent.get(nodeId)!;
    const edgeId = edgeToChild.get(nodeId)!;
    const edge = edges.find((e) => e.id === edgeId);
    const cableData = (edge?.data as CableEdgeData) || {
      length: 0,
      crossSection: 25,
    };

    // A cable can opt out of design-current scaling (the Rack workbook's
    // K1-5 row) and carry the raw downstream total instead.
    const appliedFactor = cableData.skipDesignCurrentFactor
      ? 1
      : designCurrentFactor;
    const current = (totalCurrents.get(nodeId) || 0) * appliedFactor;
    const length = cableData.length || 0;
    const crossSection = cableData.crossSection || 25;
    const parallelCount = resolveParallelCount(cableData.parallelCount);
    // n parallel runs of A act as area n×A: drop and Rh scale as 1/n.
    const area = effectiveCrossSection(crossSection, parallelCount);

    const loopImpedance = calculateLoopImpedance(length, area);
    const voltageDropV = calculateVoltageDropV(
      length,
      area,
      current,
      phaseMode,
    );
    const voltageDropPercent = calculateVoltageDropPercent(
      voltageDropV,
      systemVoltage,
      phaseMode,
    );
    // Per-cable allowed drop overrides the global ÁSZ value when set.
    const edgeAllowedDropV =
      cableData.allowedVoltageDropPercent != null
        ? calculateAllowedVoltageDropV(
            systemVoltage,
            cableData.allowedVoltageDropPercent,
            phaseMode,
          )
        : allowedDropV;
    // Excel A_min is the total aluminium the segment needs; store the size of
    // each parallel run so it compares with the chosen crossSection.
    const requiredCrossSection =
      calculateMinCrossSection(length, current, edgeAllowedDropV) /
      parallelCount;
    // Excel "Iz" (Q column) is per-cable: 230 V / that cable's own loop impedance.
    const shortCircuitCurrent = calculateShortCircuitCurrent(loopImpedance);

    // Geometry and load are all the recommendation pass below needs: the
    // current a cable carries depends only on the downstream devices, not on
    // its cross-section, so hypothetical sizes can be evaluated cheaply.
    edgeLoads.set(edgeId, {
      length,
      current,
      requiredCrossSection,
      parallelCount,
      allowedVoltageDropV: edgeAllowedDropV,
    });

    edgeDataMap.set(edgeId, {
      current,
      allowedVoltageDropV: edgeAllowedDropV,
      requiredCrossSection,
      impedance: loopImpedance,
      voltageDropV,
      voltageDropPercent,
      shortCircuitCurrent,
    });

    const parentVoltageDrop = cumulativeVoltageDrop.get(parentId) || 0;
    cumulativeVoltageDrop.set(nodeId, parentVoltageDrop + voltageDropPercent);

    const parentVoltageDropV = cumulativeVoltageDropV.get(parentId) || 0;
    cumulativeVoltageDropV.set(nodeId, parentVoltageDropV + voltageDropV);

    const parentImpedance = cumulativeImpedance.get(parentId) || 0;
    cumulativeImpedance.set(nodeId, parentImpedance + loopImpedance);
  }

  // --- Recommended cross-sections ---------------------------------------
  // Solved for the whole network in one pass, from topology, lengths and
  // currents only. The installed sizes are deliberately not an input: a
  // recommendation that reads the sizes the user has set changes as soon as
  // one cable is set to it, so the advice on the rest of the network would
  // no longer hold. This way "set every cable to its Javasolt" is a network
  // that is inside the limits, and re-running the engine on it repeats the
  // same numbers.
  const maxCurrentDensity =
    sourceData.maxCurrentDensity ?? DEFAULT_MAX_CURRENT_DENSITY_A_PER_MM2;

  // Every cable starts at the thinnest size its own current allows.
  const recommended = new Map<string, number>();
  for (const [edgeId, load] of edgeLoads) {
    const fromThermal = calculateThermalMinCrossSection(
      load.current / load.parallelCount,
      maxCurrentDensity,
    );
    recommended.set(
      edgeId,
      fromThermal > 0
        ? nextStandardCrossSection(fromThermal)
        : SMALLEST_CROSS_SECTION,
    );
  }

  /** ΔU [V] of one cable at a hypothetical size. */
  function dropAtSize(edgeId: string, size: number): number {
    const load = edgeLoads.get(edgeId);
    if (!load) return 0;
    return calculateVoltageDropV(
      load.length,
      effectiveCrossSection(size, load.parallelCount),
      load.current,
      phaseMode,
    );
  }

  /** The cables between a node and the source, nearest first. */
  function pathEdges(nodeId: string): string[] {
    const ids: string[] = [];
    for (
      let cur: string | null | undefined = nodeId;
      cur;
      cur = parent.get(cur)
    ) {
      const edgeId = edgeToChild.get(cur);
      if (edgeId && edgeLoads.has(edgeId)) ids.push(edgeId);
    }
    return ids;
  }

  /** Allowed cumulative ΔU [V] at each cabinet: its incoming cable's é. */
  const cabinetLimits = new Map<string, number>();
  for (const node of nodes) {
    if (node.type !== "cabinet") continue;
    const incomingId = edgeToChild.get(node.id);
    const limit =
      (incomingId
        ? edgeLoads.get(incomingId)?.allowedVoltageDropV
        : undefined) ?? allowedDropV;
    if (limit > 0) cabinetLimits.set(node.id, limit);
  }

  // While some cabinet's Fesz. esés is over its é, step up the one cable on
  // its path that buys the most volts for a single standard size. Widening
  // the biggest contributor first keeps the taper the network already has,
  // rather than dumping the whole correction on the last cable or scaling
  // every cable on the path (which overshoots on the way to standard sizes).
  const unreachable = new Set<string>();
  const maxSteps = edgeLoads.size * SORTED_CROSS_SECTIONS.length + 1;
  for (let step = 0; step < maxSteps; step++) {
    let worstNode: string | undefined;
    let worstExcess = 0;
    for (const [nodeId, limit] of cabinetLimits) {
      if (unreachable.has(nodeId)) continue;
      const drop = pathEdges(nodeId).reduce(
        (sum, edgeId) => sum + dropAtSize(edgeId, recommended.get(edgeId)!),
        0,
      );
      const excess = drop - limit;
      if (excess > worstExcess + 1e-9) {
        worstExcess = excess;
        worstNode = nodeId;
      }
    }
    if (!worstNode) break;

    let bestEdge: string | undefined;
    let bestSize = 0;
    let bestGain = 0;
    for (const edgeId of pathEdges(worstNode)) {
      const size = recommended.get(edgeId)!;
      const larger = SORTED_CROSS_SECTIONS.find((s) => s > size);
      if (larger === undefined) continue;
      const gain = dropAtSize(edgeId, size) - dropAtSize(edgeId, larger);
      if (gain > bestGain) {
        bestGain = gain;
        bestEdge = edgeId;
        bestSize = larger;
      }
    }

    // Every cable on this path is already at the largest standard size.
    if (!bestEdge) {
      unreachable.add(worstNode);
      continue;
    }
    recommended.set(bestEdge, bestSize);
  }

  // Lépcsőzetesség: a cable is never thinner than any cable it feeds. Applied
  // last because it only enlarges, so it cannot break the drop limits above.
  // postOrder settles children before their parent.
  for (const nodeId of postOrder) {
    const edgeId = edgeToChild.get(nodeId);
    if (!edgeId) continue;
    let maxChild = 0;
    for (const childId of children.get(nodeId) || []) {
      const childEdgeId = edgeToChild.get(childId);
      if (!childEdgeId) continue;
      maxChild = Math.max(maxChild, recommended.get(childEdgeId) ?? 0);
    }
    if (maxChild > (recommended.get(edgeId) ?? 0)) {
      recommended.set(edgeId, maxChild);
    }
  }

  // What each cable actually needs, in context.
  //
  // requiredCrossSection answers that for one cable in isolation, which is
  // misleading on its own: it hands the whole allowed drop to every cable, so
  // it reads far too optimistic for a cable deep in the network. The
  // network-wide voltage-drop half of the question is how thin this one cable
  // could be, with every other cable at its recommended size, before some
  // cabinet downstream of it goes over the limit; whichever path leaves it the
  // least room decides. The thermal half is I / maxCurrentDensity: a short
  // trunk carrying the whole network has almost no voltage drop of its own, but
  // still cannot be thinner than that floor.
  //
  // The reported figure is the largest of the three, which is what the
  // recommendation rounds up from (grading can still push the recommendation
  // higher still).
  const dropAtRecommended = new Map<string, number>();
  for (const [edgeId, load] of edgeLoads) {
    dropAtRecommended.set(
      edgeId,
      calculateVoltageDropPercent(
        calculateVoltageDropV(
          load.length,
          effectiveCrossSection(
            recommended.get(edgeId) ?? SMALLEST_CROSS_SECTION,
            load.parallelCount,
          ),
          load.current,
          phaseMode,
        ),
        systemVoltage,
        phaseMode,
      ),
    );
  }

  const remainingBudget = new Map<string, number>();
  for (const node of nodes) {
    if (node.type !== "cabinet") continue;

    const pathEdges: string[] = [];
    for (
      let cur: string | null | undefined = node.id;
      cur;
      cur = parent.get(cur)
    ) {
      const edgeId = edgeToChild.get(cur);
      if (edgeId && edgeLoads.has(edgeId)) pathEdges.push(edgeId);
    }

    const pathDrop = pathEdges.reduce(
      (sum, edgeId) => sum + (dropAtRecommended.get(edgeId) ?? 0),
      0,
    );
    for (const edgeId of pathEdges) {
      const budget =
        allowedDropPercent - (pathDrop - (dropAtRecommended.get(edgeId) ?? 0));
      const tightest = remainingBudget.get(edgeId);
      if (tightest === undefined || budget < tightest) {
        remainingBudget.set(edgeId, budget);
      }
    }
  }

  for (const [edgeId, size] of recommended) {
    const updates = edgeDataMap.get(edgeId);
    if (!updates) continue;
    updates.recommendedCrossSection = size;

    const load = edgeLoads.get(edgeId);
    // Drop is inversely proportional to area, so the area that exactly fills
    // the remaining budget scales off the recommended size's own drop.
    const budget = remainingBudget.get(edgeId);
    const drop = dropAtRecommended.get(edgeId) ?? 0;
    const inNetwork =
      budget !== undefined && budget > 0 && drop > 0 ? (size * drop) / budget : 0;

    const voltageDropRequirement = Math.max(load?.requiredCrossSection ?? 0, inNetwork);
    const thermalRequirement = calculateThermalMinCrossSection(
      (load?.current ?? 0) / (load?.parallelCount ?? 1),
      maxCurrentDensity,
    );
    const binding = Math.max(voltageDropRequirement, thermalRequirement);

    if (binding > 0) {
      updates.networkRequiredCrossSection = binding;
      updates.networkRequiredCrossSectionReason =
        thermalRequirement > voltageDropRequirement ? "current" : "voltageDrop";
      // Whether lépcsőzetesség alone pushed the recommendation past what
      // rounding the requirement up would already have given it.
      updates.recommendedGradedUp = size > nextStandardCrossSection(binding);
    }
  }

  const updatedEdges = edges.map((edge) => {
    const updates = edgeDataMap.get(edge.id);
    if (!updates) return edge;
    return {
      ...edge,
      data: {
        ...edge.data,
        ...updates,
      },
    };
  });

  const updatedNodes = nodes.map((node) => {
    if (node.type !== "cabinet") return node;

    const data = node.data as CabinetNodeData;
    const ownCurrent = sumDeviceCurrents(data.devices || []);
    const totalCurrent = totalCurrents.get(node.id) || 0;
    // Per the Excel summary block ("Hurok IMP" / "Iz" rows of "1. körzet"):
    // a cabinet's loop impedance is the accumulated path back to the source,
    // and its Iz is 230 V over that accumulated impedance. The per-segment
    // values stay on the edges (the Q/R columns of the cable rows).
    const loopImpedance = cumulativeImpedance.get(node.id) ?? 0;
    const shortCircuitCurrent = calculateShortCircuitCurrent(loopImpedance);
    const voltageDrop = cumulativeVoltageDrop.get(node.id) || 0;
    const voltageDropV = cumulativeVoltageDropV.get(node.id) || 0;
    const maxFuseRating = calculateMaxFuseRating(shortCircuitCurrent);

    return {
      ...node,
      data: {
        ...data,
        ownCurrent,
        totalCurrent,
        loopImpedance,
        shortCircuitCurrent,
        cumulativeVoltageDrop: voltageDrop,
        cumulativeVoltageDropV: voltageDropV,
        cumulativeVoltageDropLimit: allowedDropPercent,
        maxFuseRating,
      },
    };
  });

  return { nodes: updatedNodes, edges: updatedEdges };
}
