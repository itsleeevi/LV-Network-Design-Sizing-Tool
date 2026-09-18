"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, useReactFlow, useStore, type Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFlowStore } from "@/store/flow-store";
import { useT } from "@/lib/i18n";
import { isPlacementFree, snapPlacementPosition, type Rect } from "@/lib/placement";
import { BOX_H, BOX_W, DiagonalCabinetSymbol } from "../nodes/diagonal-cabinet-symbol";

const CABINET_SIZE = { width: BOX_W, height: BOX_H };

/** A click that moved this far since its press was a canvas pan, not a placement. */
const DRAG_TOLERANCE_PX = 4;

function occupiedRectsOf(nodes: Node[]): Rect[] {
  return nodes.map((node) => ({
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? node.width ?? CABINET_SIZE.width,
    height: node.measured?.height ?? node.height ?? CABINET_SIZE.height,
  }));
}

/**
 * Click-to-place for new elements: while a toolbar element is armed, a ghost of
 * it follows the cursor at the exact spot (and scale) it will land on, a click
 * drops it there, Shift keeps placing, and Escape / right-click cancels.
 *
 * Must render inside <ReactFlow> for the coordinate conversions, and listens on
 * the canvas root in the bubble phase so a placing click is swallowed before
 * React Flow's own pane/node click handlers see it.
 */
export function PlacementLayer() {
  const t = useT();
  const pendingPlacement = useFlowStore((s) => s.pendingPlacement);
  const cancelPlacement = useFlowStore((s) => s.cancelPlacement);
  const addCabinet = useFlowStore((s) => s.addCabinet);
  const nodes = useFlowStore((s) => s.nodes);

  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  const transform = useStore((s) => s.transform);
  const domNode = useStore((s) => s.domNode);
  const zoom = transform[2];

  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const pressRef = useRef<{ x: number; y: number } | null>(null);

  const active = pendingPlacement !== null;

  const occupied = useMemo(
    () => (active ? occupiedRectsOf(nodes) : []),
    [active, nodes],
  );

  /** Where a click at `point` would put the element, snapped to the grid. */
  const targetOf = useCallback(
    (point: { x: number; y: number }) =>
      snapPlacementPosition(screenToFlowPosition(point), CABINET_SIZE),
    [screenToFlowPosition],
  );

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelPlacement();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, cancelPlacement]);

  useEffect(() => {
    if (!active || !domNode) return;

    // The toolbar, controls and minimap keep working while placing.
    const isOnCanvas = (target: EventTarget | null) =>
      !(target instanceof Element) || !target.closest(".react-flow__panel");

    const onPointerMove = (event: PointerEvent) => {
      if (!isOnCanvas(event.target)) {
        setCursor(null);
        return;
      }
      setCursor({ x: event.clientX, y: event.clientY });
    };

    const onPointerLeave = () => setCursor(null);

    const onPointerDown = (event: PointerEvent) => {
      pressRef.current = { x: event.clientX, y: event.clientY };
    };

    const onClick = (event: MouseEvent) => {
      const press = pressRef.current;
      pressRef.current = null;
      if (!isOnCanvas(event.target)) return;
      if (
        press &&
        Math.hypot(event.clientX - press.x, event.clientY - press.y) >
          DRAG_TOLERANCE_PX
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const position = targetOf({ x: event.clientX, y: event.clientY });
      // Occupied spots stay armed: the ghost is already showing why, so the
      // user only has to move a little and click again.
      const free = isPlacementFree(
        position,
        CABINET_SIZE,
        occupiedRectsOf(useFlowStore.getState().nodes),
      );
      if (!free) return;

      addCabinet(position);
      if (!event.shiftKey) cancelPlacement();
    };

    const onContextMenu = (event: MouseEvent) => {
      if (!isOnCanvas(event.target)) return;
      event.preventDefault();
      cancelPlacement();
    };

    domNode.addEventListener("pointermove", onPointerMove);
    domNode.addEventListener("pointerleave", onPointerLeave);
    domNode.addEventListener("pointerdown", onPointerDown);
    domNode.addEventListener("click", onClick);
    domNode.addEventListener("contextmenu", onContextMenu);

    return () => {
      domNode.removeEventListener("pointermove", onPointerMove);
      domNode.removeEventListener("pointerleave", onPointerLeave);
      domNode.removeEventListener("pointerdown", onPointerDown);
      domNode.removeEventListener("click", onClick);
      domNode.removeEventListener("contextmenu", onContextMenu);
      // So re-arming does not flash a ghost at the previous cursor position.
      setCursor(null);
    };
  }, [active, domNode, addCabinet, cancelPlacement, targetOf]);

  if (!active) return null;

  const target = cursor ? targetOf(cursor) : null;
  const blocked =
    target !== null && !isPlacementFree(target, CABINET_SIZE, occupied);
  const ghost = target ? flowToScreenPosition(target) : null;

  return (
    <>
      {ghost && (
        <div
          className="pointer-events-none fixed z-50 origin-top-left"
          style={{
            left: ghost.x,
            top: ghost.y,
            transform: `scale(${zoom})`,
          }}
        >
          <div
            className={cn(
              "outline-2 outline-dashed outline-offset-2",
              blocked
                ? "opacity-40 outline-red-500"
                : "opacity-80 outline-blue-500",
            )}
          >
            <DiagonalCabinetSymbol />
          </div>
        </div>
      )}

      <Panel
        position="bottom-center"
        className="pointer-events-none m-3! flex items-center gap-3 whitespace-nowrap rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-md"
      >
        <span className={cn(blocked ? "text-red-600" : "text-foreground")}>
          {blocked ? t("placement.blocked") : t("placement.hintCabinet")}
        </span>
        <span className="text-muted-foreground">{t("placement.hintKeys")}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={cancelPlacement}
          className="pointer-events-auto h-6 px-2"
        >
          {t("placement.cancel")}
        </Button>
      </Panel>
    </>
  );
}
