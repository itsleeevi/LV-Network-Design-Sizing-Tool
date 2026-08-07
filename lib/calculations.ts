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
  DESIGN_CURRENT_SAFETY_FACTOR,
  FUSE_CURRENT_DIVISOR,
} from "@/types/electrical";

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
  const designCurrentFactor = sourceData.useDesignCurrent
    ? DESIGN_CURRENT_SAFETY_FACTOR / (phaseMode === "3F" ? 3 : 1)
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

    const current = (totalCurrents.get(nodeId) || 0) * designCurrentFactor;
    const length = cableData.length || 0;
    const crossSection = cableData.crossSection || 25;

    const loopImpedance = calculateLoopImpedance(length, crossSection);
    const voltageDropV = calculateVoltageDropV(
      length,
      crossSection,
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
    const requiredCrossSection = calculateMinCrossSection(
      length,
      current,
      edgeAllowedDropV,
    );
    // Excel "Iz" (Q column) is per-cable: 230 V / that cable's own loop impedance.
    const shortCircuitCurrent = calculateShortCircuitCurrent(loopImpedance);

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
        maxFuseRating,
      },
    };
  });

  return { nodes: updatedNodes, edges: updatedEdges };
}
