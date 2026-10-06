/** A width and height in one unit — natural image pixels, or layout px for a pane. */
export type PairViewerSize = { w: number; h: number }

export type PairViewerFitInput = {
  /** The image's own pixel size; `undefined` until its bytes have decoded. */
  natural: PairViewerSize | undefined
  /** The box the image must fit inside, in layout px; `undefined` until measured. */
  pane: PairViewerSize | undefined
  /** Device pixels per layout px — upscaling past the natural size stops here. */
  pixelRatio?: number
  /** Hard ceiling on the fit scale, whatever the pixel ratio. */
  cap?: number
}

export type PairViewerPairFitInput = Omit<PairViewerFitInput, 'natural'> & {
  /** Every frame shown under the one shared scale; unloaded ones are skipped. */
  naturals: readonly (PairViewerSize | undefined)[]
}

/** How a measured stage is carved into the box each frame gets. */
export type PairViewerPaneLayout = {
  /** Frames side by side (Mirror with both captures = 2). */
  columns: number
  /** Horizontal gap between columns, in layout px. */
  gap: number
  /** Height kept free under each frame for its caption / controls. */
  reserveHeight: number
}
