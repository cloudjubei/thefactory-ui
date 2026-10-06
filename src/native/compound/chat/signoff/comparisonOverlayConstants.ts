import type { PairViewerSize } from '../../../../headless'

/** The gap between two mirrored frames. */
export const PAIR_STAGE_GAP = 24
/** The stage's content padding, both sides. */
export const PAIR_STAGE_PADDING = 8 * 2
/** Room under a Mirror/Diff frame for its caption (which can wrap to two lines). */
export const PAIR_CAPTION_RESERVE = 56
/** The loading skeleton, until a frame's real size arrives with its bytes. */
export const PAIR_LOADING_FRAME: PairViewerSize = { w: 240, h: 480 }
