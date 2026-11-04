import { useFlowStore } from "@/store/flow-store";

/**
 * Whether this node is the one being edited. Nodes select themselves through
 * the store's selectedNodeId on click, which React Flow's own `selected` flag
 * does not always follow, so both are checked.
 */
export function useIsNodeSelected(id: string, selected: boolean | undefined) {
  const storeSelected = useFlowStore((s) => s.selectedNodeId === id);
  return Boolean(selected) || storeSelected;
}
