import type { PairViewerSize } from '../../../../headless'

/** `gap-6` between two mirrored frames. */
export const PAIR_STAGE_GAP = 24
/** `p-2` around the stage, both sides. */
export const PAIR_STAGE_PADDING = 8 * 2
/** Room under a frame for its caption (which can wrap to two lines). */
export const PAIR_CAPTION_RESERVE = 56
/** Slide also carries the reveal range under its caption. */
export const PAIR_SLIDE_RESERVE = PAIR_CAPTION_RESERVE + 32
/** The loading skeleton, until a frame's real size arrives with its bytes. */
export const PAIR_LOADING_FRAME: PairViewerSize = { w: 240, h: 480 }
