import type { ProcessStatusTone } from './processView'
import type { EvidenceTile } from './reviewEvidenceViewTypes'

/** A badge of the step log view: its words and its tone. */
export type ScriptLogBadge = { label: string; tone: ProcessStatusTone }

/** One line of a step log, as its row shows it. */
export type ScriptLogRowView = {
  key: string
  /** The line's kind as the script wrote it. */
  kind: string
  /** The kind as its badge says it: an ask, a take-over by how it ended, or the script's own word. */
  kindBadge: ScriptLogBadge
  title: string
  detail: string | undefined
  items: readonly string[]
  /** Where an ask's answer came from: Pinned or Live. */
  sourceBadge: ScriptLogBadge | undefined
  cost: string | undefined
}

/** One section of a step log: its lines in the order they came. */
export type ScriptLogSectionView = {
  key: string
  title: string
  /** What its folded row says under the title: lines, asks and live ones, take-overs. */
  line: string
  rows: readonly ScriptLogRowView[]
  /** The worst take-over of the section, for its folded row. */
  takeOverBadge: ScriptLogBadge | undefined
  costUsd: number | undefined
  cost: string | undefined
}

/** What a script step's attempt shows: the sections of its step log, and the recording beside them. */
export type ScriptStepLogView = {
  sections: readonly ScriptLogSectionView[]
  /** `2 sections · 5 asks, 3 live · 1 take-over`; absent with no step log. */
  summaryLine: string | undefined
  totalCost: string | undefined
  recording: EvidenceTile | undefined
  /** The screenshot filed when the script stopped short. */
  stoppedAt: EvidenceTile | undefined
  /** Lines of the step log that could not be read, said in a line. */
  unread: string | undefined
  /** Why there are no sections to show; absent when there are. */
  empty: string | undefined
  /** The section open at first: the last one, where the script ended. */
  openSection: string | undefined
}
