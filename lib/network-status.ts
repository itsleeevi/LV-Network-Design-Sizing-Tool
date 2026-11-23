import type { Edge, Node } from "@xyflow/react";
import type { CabinetNodeData, CableEdgeData } from "@/types/electrical";
import { buildNetworkTree } from "@/lib/downstream";

/**
 * Cabinets whose voltage drop from the source is over the é of the cable that
 * feeds them: the same limit the Recommended sizes are solved against
 * (cabinetLimits in lib/calculations.ts), read from the last calculation.
 */
export function cabinetsOverDropLimit(nodes: Node[], edges: Edge[]): Set<string> {
  const tree = buildNetworkTree(nodes, edges);
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const over = new Set<string>();
  for (const node of nodes) {
    if (node.type !== "cabinet") continue;
    const drop = (node.data as CabinetNodeData).cumulativeVoltageDropV;
    const edgeId = tree.parentEdge.get(node.id);
    const limit = edgeId
      ? (edgeById.get(edgeId)?.data as CableEdgeData | undefined)?.allowedVoltageDropV
      : undefined;
    if (drop != null && limit != null && limit > 0 && drop > limit + 1e-9) {
      over.add(node.id);
    }
  }
  return over;
}
