import type { Node, Edge } from "@xyflow/react";
import type {
  CabinetNodeData,
  CableEdgeData,
  AszNodeData,
  Device,
} from "@/types/electrical";
import { CABLE_RESISTIVITY } from "@/types/electrical";

const SQRT3 = Math.sqrt(3);
const PHASE_VOLTAGE = 230; // V (phase-to-neutral)
const RHO = CABLE_RESISTIVITY;

/**
 * Calculate loop impedance [Ω]
 * Rh = 2 × ρ × L / A (go + return path)
 */
export function calculateLoopImpedance(length: number, crossSection: number): number {
  if (crossSection <= 0 || length <= 0) return 0;
  return (2 * RHO * length) / crossSection;
}

/**
 * Calculate voltage drop [V] for a cable segment
 * ΔU = √3 × ρ × L × I / A (3-phase formula)
 */
export function calculateVoltageDropV(
  length: number,
  crossSection: number,
  current: number
): number {
  if (crossSection <= 0 || current <= 0 || length <= 0) return 0;
  return (SQRT3 * RHO * length * current) / crossSection;
}

/**
 * Calculate voltage drop percentage
 * ΔU% = ΔU / systemVoltage × 100
 */
export function calculateVoltageDropPercent(
  voltageDropV: number,
  systemVoltage: number
): number {
  if (systemVoltage <= 0) return 0;
  return (voltageDropV / systemVoltage) * 100;
}

/**
 * Calculate allowed voltage drop per phase [V]
 * Based on Excel: 4% → 6.9V formula
 */
export function calculateAllowedVoltageDropV(
  systemVoltage: number,
  allowedPercent: number
): number {
  return (systemVoltage * (allowedPercent / 100) * SQRT3) / 4;
}

/**
 * Calculate required minimum cross-section [mm²]
 * A_min = (ρ × L × I) / ΔU_allowed
 */
export function calculateMinCrossSection(
  length: number,
  current: number,
  allowedVoltageDropV: number
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

/** Build adjacency list from edges */
function buildAdjacencyList(edges: Edge[]): Map<string, { nodeId: string; edgeId: string }[]> {
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
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const sourceNode = findSourceNode(nodes);
  if (!sourceNode) return { nodes, edges };

  const sourceData = sourceNode.data as AszNodeData;
  const systemVoltage = sourceData.voltage || 400;
  const allowedDropPercent = sourceData.allowedVoltageDrop || 4;
  const allowedDropV = calculateAllowedVoltageDropV(systemVoltage, allowedDropPercent);

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

  const cumulativeImpedance = new Map<string, number>();
  const cumulativeVoltageDrop = new Map<string, number>();
  cumulativeImpedance.set(sourceNode.id, 0);
  cumulativeVoltageDrop.set(sourceNode.id, 0);

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
    const cableData = (edge?.data as CableEdgeData) || { length: 0, crossSection: 25 };

    const current = totalCurrents.get(nodeId) || 0;
    const length = cableData.length || 0;
    const crossSection = cableData.crossSection || 25;

    const loopImpedance = calculateLoopImpedance(length, crossSection);
    const voltageDropV = calculateVoltageDropV(length, crossSection, current);
    const voltageDropPercent = calculateVoltageDropPercent(voltageDropV, systemVoltage);
    const requiredCrossSection = calculateMinCrossSection(length, current, allowedDropV);

    edgeDataMap.set(edgeId, {
      current,
      requiredCrossSection,
      impedance: loopImpedance,
      voltageDropV,
      voltageDropPercent,
    });

    const parentImpedance = cumulativeImpedance.get(parentId) || 0;
    const parentVoltageDrop = cumulativeVoltageDrop.get(parentId) || 0;
    cumulativeImpedance.set(nodeId, parentImpedance + loopImpedance);
    cumulativeVoltageDrop.set(nodeId, parentVoltageDrop + voltageDropPercent);
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
    const loopImpedance = cumulativeImpedance.get(node.id) || 0;
    const shortCircuitCurrent = calculateShortCircuitCurrent(loopImpedance);
    const voltageDrop = cumulativeVoltageDrop.get(node.id) || 0;

    return {
      ...node,
      data: {
        ...data,
        ownCurrent,
        totalCurrent,
        loopImpedance,
        shortCircuitCurrent,
        cumulativeVoltageDrop: voltageDrop,
      },
    };
  });

  return { nodes: updatedNodes, edges: updatedEdges };
}
