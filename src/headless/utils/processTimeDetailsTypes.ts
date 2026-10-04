/** The parts a piece of work's time splits into, in the order a breakdown lists them. */
export type ProcessTimePart = 'thinking' | 'tools' | 'system' | 'other' | 'running'

/** One part of the work, as a time's details read it. */
export type ProcessTimeDetailsRow = {
  key: ProcessTimePart
  label: string
  /** What the part holds, in a few words. */
  hint: string
  /** Its duration, as the time chip words one. */
  value: string
  /** Its share of the total, as a percentage. */
  share: string
  /** Its share of the total, 0 to 1 — the width of its bar. */
  fraction: number
}

/** One of the slowest tools. */
export type ProcessTimeDetailsTool = {
  /** The tool, with how many calls when it was called more than once: `mobileTestBuildApp ×3`. */
  label: string
  value: string
}

/**
 * Where a time chip's time went — the one view every time chip opens. Worded
 * here so the web popover and the native sheet read the same.
 */
export type ProcessTimeDetailsView = {
  /** The chip's own total. */
  total: string
  rows: ProcessTimeDetailsRow[]
  /** The slowest tools, slowest first. */
  tools: ProcessTimeDetailsTool[]
  /** Time spent waiting on a person, beside the total and never in it. */
  waiting?: string
}
