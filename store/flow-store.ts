import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Node, Edge, Connection } from "@xyflow/react";
import {
  CabinetNodeData,
  FmNodeData,
  FeNodeData,
  CableEdgeData,
  AszNodeData,
  DEFAULT_CABINET_DATA,
  DEFAULT_ASZ_DATA,
  DEFAULT_FM_DATA,
  DEFAULT_FE_DATA,
  DEFAULT_CABLE_DATA,
} from "@/types/electrical";
import { runCalculations } from "@/lib/calculations";
import { autoLayoutSchematic } from "@/lib/auto-layout";

export type CanvasMode = "move" | "wire";

export const ASZ_ROOT_ID = "asz-root";
export const FEED_ROOT_ID = "feed-root";
const EDGE_ASZ_FEED_ID = "edge-asz-feed";

function initialNodes(): Node[] {
  return [
    {
      id: ASZ_ROOT_ID,
      type: "asz",
      position: { x: 400, y: 48 },
      data: { ...DEFAULT_ASZ_DATA },
    },
    {
      id: FEED_ROOT_ID,
      type: "feed",
      position: { x: 400, y: 168 },
      data: { label: "FM" },
    },
  ];
}

function initialEdges(): Edge[] {
  return [
    {
      id: EDGE_ASZ_FEED_ID,
      source: ASZ_ROOT_ID,
      target: FEED_ROOT_ID,
      sourceHandle: "bottom",
      targetHandle: "top",
      type: "wire",
      data: { ...DEFAULT_CABLE_DATA },
    },
  ];
}

type FlowStore = {
  nodes: Node[];
  edges: Edge[];
  canvasMode: CanvasMode;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setCanvasMode: (mode: CanvasMode) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;

  addCabinet: () => void;
  addFm: () => void;
  addFe: () => void;
  connectNodes: (connection: Connection) => void;
  
  updateNodeData: (nodeId: string, data: Partial<CabinetNodeData | FmNodeData | FeNodeData | AszNodeData>) => void;
  updateEdgeData: (edgeId: string, data: Partial<CableEdgeData>) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  runCalculations: () => void;
  autoLayout: () => void;

  /** Replace the whole diagram (used when opening a project file). */
  loadProject: (project: { nodes: Node[]; edges: Edge[] }) => void;
  /** Reset to a fresh, empty diagram. */
  newProject: () => void;

  /** True once the persisted state has been read from localStorage. */
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;

  /** Whether the start screen has been dismissed this session (not persisted). */
  welcomeDismissed: boolean;
  setWelcomeDismissed: (value: boolean) => void;
};

export const PROJECT_STORAGE_KEY = "wire-app-project";

export const useFlowStore = create<FlowStore>()(
  persist(
    (set, get) => ({
  nodes: initialNodes(),
  edges: initialEdges(),
  canvasMode: "move",
  selectedNodeId: null,
  selectedEdgeId: null,
  hasHydrated: false,
  welcomeDismissed: false,

  setCanvasMode: (mode) => set({ canvasMode: mode }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addCabinet: () => {
    const nodes = get().nodes;
    const cabinetCount = nodes.filter((n) => n.type === "cabinet").length;

    const newNode: Node = {
      id: crypto.randomUUID(),
      type: "cabinet",
      position: {
        x: 80 + cabinetCount * 240,
        y: 368,
      },
      data: { ...DEFAULT_CABINET_DATA },
    };

    set({ nodes: [...nodes, newNode], selectedNodeId: newNode.id });
  },

  addFm: () => {
    const nodes = get().nodes;
    const fmCount = nodes.filter((n) => n.type === "fm").length;

    const newNode: Node = {
      id: crypto.randomUUID(),
      type: "fm",
      position: {
        x: 300 + fmCount * 100,
        y: 100,
      },
      data: { ...DEFAULT_FM_DATA, label: `FM${fmCount + 1}` },
    };

    set({ nodes: [...nodes, newNode], selectedNodeId: newNode.id });
  },

  addFe: () => {
    const nodes = get().nodes;
    const feCount = nodes.filter((n) => n.type === "fe").length;

    const newNode: Node = {
      id: crypto.randomUUID(),
      type: "fe",
      position: {
        x: 300 + feCount * 100,
        y: 200,
      },
      data: { ...DEFAULT_FE_DATA, label: `FE${feCount + 1}` },
    };

    set({ nodes: [...nodes, newNode], selectedNodeId: newNode.id });
  },

  connectNodes: (connection) => {
    if (get().canvasMode !== "wire") return;

    const newEdge: Edge = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
      type: "wire",
      data: { ...DEFAULT_CABLE_DATA },
    };
    set({
      edges: [...get().edges, newEdge],
    });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
  },

  updateEdgeData: (edgeId, data) => {
    set({
      edges: get().edges.map((edge) =>
        edge.id === edgeId
          ? { ...edge, data: { ...edge.data, ...data } }
          : edge
      ),
    });
  },

  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    });
  },

  deleteEdge: (edgeId) => {
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
      selectedEdgeId: get().selectedEdgeId === edgeId ? null : get().selectedEdgeId,
    });
  },

  runCalculations: () => {
    const { nodes, edges } = runCalculations(get().nodes, get().edges);
    set({ nodes, edges });
  },

  autoLayout: () => {
    const { nodes, edges } = autoLayoutSchematic(
      get().nodes,
      get().edges,
      get().selectedNodeId
    );
    set({ nodes, edges });
  },

  loadProject: (project) =>
    set({
      nodes: project.nodes,
      edges: project.edges,
      selectedNodeId: null,
      selectedEdgeId: null,
    }),

  newProject: () =>
    set({
      nodes: initialNodes(),
      edges: initialEdges(),
      canvasMode: "move",
      selectedNodeId: null,
      selectedEdgeId: null,
    }),

  setHasHydrated: (value) => set({ hasHydrated: value }),

  setWelcomeDismissed: (value) => set({ welcomeDismissed: value }),
    }),
    {
      name: PROJECT_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist the diagram itself, not transient UI/selection state.
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        canvasMode: state.canvasMode,
      }),
      // Read from localStorage manually after mount to avoid SSR hydration
      // mismatches; see useProjectHydration.
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
