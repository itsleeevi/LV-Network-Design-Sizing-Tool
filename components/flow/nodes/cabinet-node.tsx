"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Handle,
  Position,
  NodeProps,
  useUpdateNodeInternals,
} from "@xyflow/react";
import type { CabinetNodeData } from "@/types/electrical";
import { useFlowStore } from "@/store/flow-store";
import { DiagonalCabinetSymbol, BOX_H, BOX_W } from "./diagonal-cabinet-symbol";
import {
  getConnectedSides,
  getLabelPlacement,
  labelOffsetClass,
  type LabelPlacement,
} from "@/lib/cabinet-label-placement";
import { cn } from "@/lib/utils";

function SideHandle({
  position,
  connected,
}: {
  position: Position;
  connected: boolean;
}) {
  const side = position.toLowerCase();
  const className = cn("cabinet-port", connected && "cabinet-port--connected");

  return (
    <Handle type="source" position={position} id={side} className={className} />
  );
}

function CabinetRenameField({
  draft,
  inputRef,
  onDraftChange,
  onCommit,
  onCancel,
}: {
  draft: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const widthCh = Math.max(draft.length, 1) + 0.5;

  return (
    <div
      className="pointer-events-auto nodrag nopan inline-flex max-w-[220px] rounded border border-border bg-background px-1 py-0.5 shadow-sm"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="text"
        value={draft}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onDraftChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        style={{ width: `${widthCh}ch` }}
        className="block border-0 bg-transparent p-0 text-center text-sm leading-snug text-red-600 outline-none ring-0 focus:ring-0"
        aria-label="Szekrény neve"
      />
    </div>
  );
}

/** Multi-line cabinet info display */
function CabinetInfo({
  data,
  placement,
  onStartEdit,
}: {
  data: CabinetNodeData;
  placement: LabelPlacement;
  onStartEdit: (event: React.MouseEvent) => void;
}) {
  const align =
    placement === "left"
      ? "text-right"
      : placement === "right"
        ? "text-left"
        : "text-center";

  const devices = data.devices || [];

  return (
    <div className={cn("whitespace-nowrap text-[10px] leading-tight text-red-600", align)}>
      {/* Main label - clickable for rename */}
      <button
        type="button"
        onClick={onStartEdit}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "pointer-events-auto nodrag nopan block w-full rounded px-0.5 text-sm font-medium leading-snug",
          "cursor-text hover:bg-red-50",
          align,
        )}
        title="Kattints az átnevezéshez"
      >
        {data.label}
      </button>

      {/* Side */}
      {data.side && <div>{data.side}</div>}

      {/* Devices list - Berendezés / Áram [A] */}
      {devices.map((dev, i) => (
        <div key={i}>
          {dev.type} {dev.current}A
        </div>
      ))}

      {/* Calculated values (matches Excel summary table T-AD rows 4-6) */}
      {data.cumulativeVoltageDrop !== undefined && data.cumulativeVoltageDrop > 0 && (
        <div className="font-medium text-blue-600">
          Fesz esés: {data.cumulativeVoltageDrop.toFixed(1)}
        </div>
      )}
      {data.loopImpedance !== undefined && data.loopImpedance > 0 && (
        <div className="font-medium text-blue-600">
          Hurok IMP: {data.loopImpedance.toFixed(3)}
        </div>
      )}
      {data.shortCircuitCurrent !== undefined && data.shortCircuitCurrent > 0 && (
        <div className="font-medium text-blue-600">
          Iz [A]: {data.shortCircuitCurrent.toFixed(1)}
        </div>
      )}
    </div>
  );
}

export function CabinetNode({ id, data, selected }: NodeProps) {
  const d = data as CabinetNodeData;
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const canvasMode = useFlowStore((s) => s.canvasMode);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const updateNodeInternals = useUpdateNodeInternals();

  const wireMode = canvasMode === "wire";

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const connectedSides = useMemo(
    () => getConnectedSides(id, edges, nodes),
    [id, edges, nodes],
  );

  const labelPlacement = useMemo(
    () => getLabelPlacement(connectedSides),
    [connectedSides],
  );

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, edges, updateNodeInternals, wireMode]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const commitEdit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed) updateNodeData(id, { label: trimmed });
    setEditing(false);
  }, [draft, id, updateNodeData]);

  const startEdit = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setDraft(d.label);
      setEditing(true);
    },
    [d.label],
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(id);
  };

  return (
    <div
      className={cn(
        "relative overflow-visible font-sans",
        wireMode && "ring-1 ring-blue-400/60",
        selected && "ring-2 ring-blue-500 ring-offset-1",
      )}
      style={{ width: BOX_W, height: BOX_H }}
      onClick={handleClick}
    >
      <DiagonalCabinetSymbol
        wireMode={wireMode}
        connectedSides={connectedSides}
      />
      <SideHandle
        position={Position.Top}
        connected={connectedSides.has(Position.Top)}
      />
      <SideHandle
        position={Position.Bottom}
        connected={connectedSides.has(Position.Bottom)}
      />
      <SideHandle
        position={Position.Left}
        connected={connectedSides.has(Position.Left)}
      />
      <SideHandle
        position={Position.Right}
        connected={connectedSides.has(Position.Right)}
      />

      {editing ? (
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2">
          <CabinetRenameField
            draft={draft}
            inputRef={inputRef}
            onDraftChange={setDraft}
            onCommit={commitEdit}
            onCancel={cancelEdit}
          />
        </div>
      ) : (
        <div
          className={cn(
            "pointer-events-none absolute z-10 w-max",
            labelOffsetClass[labelPlacement],
          )}
        >
          <CabinetInfo
            data={d}
            placement={labelPlacement}
            onStartEdit={startEdit}
          />
        </div>
      )}
    </div>
  );
}
