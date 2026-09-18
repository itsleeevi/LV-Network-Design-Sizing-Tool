/**
 * Geometry for placing a new element on the canvas by clicking.
 *
 * The click point is the element's center (that is where the ghost preview sits
 * under the cursor), while React Flow stores a node's top-left corner, so the
 * conversion also has to know the element's size.
 */

/** Diagram coordinates the placed element's corner snaps to, so elements line up. */
export const PLACEMENT_GRID = 10;

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = Point & Size;

/** Clearance kept between a newly placed element and the existing symbols. */
const MIN_CLEARANCE = 6;

/** Node position for an element of `size` dropped centered on `center`. */
export function snapPlacementPosition(center: Point, size: Size): Point {
  return {
    x: Math.round((center.x - size.width / 2) / PLACEMENT_GRID) * PLACEMENT_GRID,
    y: Math.round((center.y - size.height / 2) / PLACEMENT_GRID) * PLACEMENT_GRID,
  };
}

/** Whether an element of `size` at `position` would sit clear of every `occupied` symbol. */
export function isPlacementFree(
  position: Point,
  size: Size,
  occupied: Rect[],
): boolean {
  return !occupied.some(
    (rect) =>
      position.x < rect.x + rect.width + MIN_CLEARANCE &&
      position.x + size.width + MIN_CLEARANCE > rect.x &&
      position.y < rect.y + rect.height + MIN_CLEARANCE &&
      position.y + size.height + MIN_CLEARANCE > rect.y,
  );
}
