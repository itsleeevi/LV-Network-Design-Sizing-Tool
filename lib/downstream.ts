import type { Node, Edge } from "@xyflow/react";

/**
 * Returns the labels of a node's *downstream* children — the nodes it feeds
 * out to, relative to the ÁSZ source. Direction is established by a BFS from
 * the source, so a node's children are the neighbours discovered through it
 * (everything except its upstream parent).
 *
 * Used to auto-derive the designation tag (e.g. ESZ3 -> "-ESZ3-1, ESZ3-8").
 */
export function getDownstreamChildLabels(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
): string[] {
  const source = nodes.find((n) => n.type === "asz");
  if (!source) return [];

  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.source)!.push(e.target);
    adj.get(e.target)!.push(e.source);
  }

  const parent = new Map<string, string | null>();
  const visited = new Set<string>([source.id]);
  parent.set(source.id, null);
  const queue: string[] = [source.id];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbour of adj.get(current) || []) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        parent.set(neighbour, current);
        queue.push(neighbour);
      }
    }
  }

  const childIds = (adj.get(nodeId) || []).filter(
    (neighbour) => parent.get(neighbour) === nodeId,
  );

  return childIds
    .map((id) => {
      const node = nodes.find((n) => n.id === id);
      const data = node?.data as { label?: string } | undefined;
      return (data?.label ?? "").trim();
    })
    .filter((label) => label.length > 0);
}

/**
 * Resolves the displayed designation tag for a node: a custom tag when set,
 * otherwise the auto "-childA, childB" derived from downstream children.
 * Returns "" when there is neither a custom tag nor any downstream child.
 */
export function resolveDesignationTag(
  customTag: string | undefined,
  downstreamLabels: string[],
): string {
  const custom = customTag?.trim();
  if (custom) return custom;
  if (downstreamLabels.length > 0) return `-${downstreamLabels.join(", ")}`;
  return "";
}
