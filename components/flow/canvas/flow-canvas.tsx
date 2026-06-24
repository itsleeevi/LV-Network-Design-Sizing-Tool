"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  ConnectionMode,
  EdgeMouseHandler,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { CabinetNode } from "../nodes/cabinet-node";
import { AszNode } from "../nodes/asz-node";
import { FeedNode } from "../nodes/feed-node";
import { FmNode } from "../nodes/fm-node";
import { FeNode } from "../nodes/fe-node"; // legacy graphs
import { WireEdge } from "../edges/wire-edge";
import { NodeInternalsSync } from "./node-internals-sync";
import { ToolbarPanel } from "./toolbar-panel";
import { PropertySidebar } from "../sidebar/property-sidebar";
import { cn } from "@/lib/utils";

import { useCallback } from "react";

import { useFlowStore } from "@/store/flow-store";

const nodeTypes = {
  cabinet: CabinetNode,
  asz: AszNode,
  feed: FeedNode,
  fm: FmNode,
  fe: FeNode,
};

const edgeTypes = {
  wire: WireEdge,
};

const defaultEdgeOptions = {
  type: "wire" as const,
};

export function FlowCanvas() {
  const {
    nodes,
    edges,
    canvasMode,
    setNodes,
    setEdges,
    connectNodes,
    setSelectedNodeId,
    setSelectedEdgeId,
  } = useFlowStore();

  const isMoveMode = canvasMode === "move";
  const isWireMode = canvasMode === "wire";

  const onNodesChange = useCallback(
    (changes: Parameters<typeof applyNodeChanges>[0]) => {
      if (isWireMode) {
        const filtered = changes.filter((c) => c.type !== "position");
        if (filtered.length > 0) {
          setNodes(applyNodeChanges(filtered, nodes));
        }
        return;
      }
      setNodes(applyNodeChanges(changes, nodes));
    },
    [nodes, setNodes, isWireMode],
  );

  const onEdgesChange = useCallback(
    (changes: Parameters<typeof applyEdgeChanges>[0]) => {
      setEdges(applyEdgeChanges(changes, edges));
    },
    [edges, setEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      connectNodes(connection);
    },
    [connectNodes],
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_, edge) => {
      setSelectedEdgeId(edge.id);
    },
    [setSelectedEdgeId],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [setSelectedNodeId, setSelectedEdgeId]);

  return (
    <div className="flex h-screen w-full">
      <div
        className={cn(
          "flex-1 font-sans",
          isMoveMode && "rf-mode-move",
          isWireMode && "rf-mode-wire",
        )}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={isWireMode ? onConnect : undefined}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionMode={ConnectionMode.Loose}
          connectionRadius={56}
          autoPanOnConnect
          selectNodesOnDrag={false}
          nodesDraggable={isMoveMode}
          nodesConnectable={isWireMode}
          connectOnClick={false}
          elementsSelectable
          panOnDrag
          fitView
        >
          <Panel position="top-left" className="!m-3">
            <ToolbarPanel />
          </Panel>
          <NodeInternalsSync />
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      <PropertySidebar />
    </div>
  );
}
