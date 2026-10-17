/** How long a finger rests on a row before the row lifts to be dragged. */
export const DRAG_LIFT_AFTER_MS = 300

/** How long rows take to slide aside, and a dropped row to settle. */
export const DRAG_SLIDE_MS = 150

/** How close to the list's top or bottom edge a lifted row starts scrolling it. */
export const DRAG_SCROLL_EDGE = 64

/** The most the list scrolls in one frame while a lifted row sits at its edge. */
export const DRAG_SCROLL_MAX_STEP = 14

/** How much bigger a lifted row is drawn. */
export const DRAG_LIFTED_SCALE = 1.02

/** The height assumed for a row the list has not laid out yet. */
export const DRAG_ESTIMATED_ROW_HEIGHT = 64
