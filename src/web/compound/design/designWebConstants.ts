/** The page width an HTML miniature is drawn at before it is scaled down. */
export const DESIGN_THUMB_FRAME = { width: 1280 } as const

/**
 * How far ahead of the screen a miniature starts to load. `scrollMargin` reaches
 * into the scrolling panes the Design tab lays out, which `rootMargin` stops at.
 */
export const DESIGN_THUMB_LOAD_AHEAD = { rootMargin: '400px', scrollMargin: '400px' }
