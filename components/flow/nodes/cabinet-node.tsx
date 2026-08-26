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
  getOccupiedSides,
  getLabelPlacement,
  labelOffsetClass,
  type LabelPlacement,
} from "@/lib/cabinet-label-placement";
import {
  getDownstreamChildLabels,
  resolveDesignationTag,
} from "@/lib/downstream";
import { useT, useSideLabel, useElementName } from "@/lib/i18n";
import { useSettingsStore } from "@/store/settings-store";
import { cn, formatCalc, formatLocaleNumber, formatNumber } from "@/lib/utils";

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
  const t = useT();
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
        aria-label={t("cabinet.nameAria")}
      />
    </div>
  );
}

/** Multi-line cabinet info display */
function CabinetInfo({
  data,
  displayLabel,
  tag,
  placement,
  onStartEdit,
}: {
  data: CabinetNodeData;
  displayLabel: string;
  tag: string;
  placement: LabelPlacement;
  onStartEdit: (event: React.MouseEvent) => void;
}) {
  const t = useT();
  const sideLabel = useSideLabel();
  const language = useSettingsStore((s) => s.language);
  const align =
    placement === "left"
      ? "text-right"
      : placement === "right"
        ? "text-left"
        : "text-center";

  const devices = data.devices || [];

  return (
    <div
      className={cn(
        "inline-block w-max whitespace-nowrap rounded bg-white px-1 py-0.5 text-[10px] leading-tight text-red-600",
        align,
      )}
    >
      {/* Main label - clickable for rename */}
      <div className={align}>
        <button
          type="button"
          onClick={onStartEdit}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto nodrag nopan inline rounded px-0.5 text-sm font-medium leading-snug cursor-text hover:bg-red-50"
          title={t("cabinet.renameTitle")}
        >
          {displayLabel}
        </button>
      </div>

      {/* Chainage / position marker (shown exactly as entered) */}
      {data.kmMarker && <div>{data.kmMarker}</div>}

      {/* Side */}
      {data.side && (
        <div>
          {sideLabel(data.side)} {t("unit.side")}
        </div>
      )}

      {/* Designation tag — downstream out-directions, or custom override */}
      {tag && <div>{tag}</div>}

      {/* Devices list - Berendezés (km szelvény / Áram) */}
      {devices.map((dev, i) => (
        <div key={i}>
          {dev.type}
          {dev.kmMarker
            ? ` (${dev.kmMarker} ${t("unit.kmsz")})`
            : dev.current
              ? ` ${formatNumber(dev.current, language, 2)}A`
              : ""}
        </div>
      ))}

      {/* Calculated values (matches Excel summary table T-AD rows 4-7) */}
      {data.cumulativeVoltageDropV !== undefined &&
        data.cumulativeVoltageDropV > 0 &&
        (() => {
          const percent = data.cumulativeVoltageDrop ?? 0;
          return (
            <div className="font-medium text-blue-600">
              {t("calc.voltageDrop")}:{" "}
              {formatLocaleNumber(data.cumulativeVoltageDropV, language, 2)} V
              {percent > 0 && (
                <>
                  {" • "}
                  {formatLocaleNumber(percent, language, 2)}%
                </>
              )}
            </div>
          );
        })()}
      {data.loopImpedance !== undefined && data.loopImpedance > 0 && (
        <div className="font-medium text-blue-600">
          {t("calc.loopImpedance")}: {formatCalc(data.loopImpedance, language)} Ω
        </div>
      )}
      {data.shortCircuitCurrent !== undefined &&
        data.shortCircuitCurrent > 0 && (
          <div className="font-medium text-blue-600">
            {t("calc.iz")}: {formatCalc(data.shortCircuitCurrent, language)}
          </div>
        )}
      {data.maxFuseRating !== undefined && data.maxFuseRating > 0 && (
        <div className="font-medium text-blue-600">
          {t("calc.maxFuse")}: {formatCalc(data.maxFuseRating, language)}
        </div>
      )}
    </div>
  );
}

export function CabinetNode({ id, data, selected }: NodeProps) {
  const elementName = useElementName();
  const d = data as CabinetNodeData;
  const displayLabel = elementName(d.label, "cabinet");
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

  const occupiedSides = useMemo(
    () => getOccupiedSides(id, edges, nodes),
    [id, edges, nodes],
  );

  const labelPlacement = useMemo(
    () => getLabelPlacement(occupiedSides),
    [occupiedSides],
  );

  const tag = useMemo(
    () =>
      resolveDesignationTag(d.tag, getDownstreamChildLabels(id, nodes, edges)),
    [d.tag, id, nodes, edges],
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
      setDraft(displayLabel);
      setEditing(true);
    },
    [displayLabel],
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
            displayLabel={displayLabel}
            tag={tag}
            placement={labelPlacement}
            onStartEdit={startEdit}
          />
        </div>
      )}
    </div>
  );
}
