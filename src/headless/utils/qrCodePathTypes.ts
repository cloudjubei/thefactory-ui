/** A QR code as one SVG path of its dark modules, one unit per module. */
export type QrCodePath = {
  /** Modules along one side, without the quiet border. */
  modules: number
  /** Covers the code and its quiet border. */
  viewBox: string
  /** Every run of dark modules in a row, as a closed rectangle. */
  path: string
}
