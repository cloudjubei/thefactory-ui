import type { ChatContext } from '../api'
import type { ProcessStatusTone } from './processView'

/** Where a run's test session stands, as the backend says. */
export type TestSessionStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'failed'

/** Why a log line is worth reporting. */
export type TestSessionLineKind = 'error' | 'warning' | 'feature'

/** A log line worth reporting, masked by the backend. */
export type TestSessionLine = {
  role: string
  kind: TestSessionLineKind
  text: string
  at: number
}

/** What the session's logs said that matters. */
export type TestSessionLog = {
  lines: TestSessionLine[]
  errors: number
  warnings: number
  feature: number
  read: number
}

/** A proof item: a record the change kept, or an event it emitted. */
export type TestSessionProof = {
  id: string
  kind: 'record' | 'event'
  label: string
  detail?: string
  source: string
  environment?: string
  at: number
}

/** A served part of the session's product. */
export type TestSessionPart = {
  role: string
  project: string
  url: string
  ref: string
  sha: string
}

/** A run's test session, as the backend keeps it. */
export type TestSession = {
  key: string
  runId: string
  status: TestSessionStatus
  startedAt: number
  stoppedAt?: number
  url?: string
  parts: TestSessionPart[]
  environment?: string
  problem?: string
  terms: string[]
  log: TestSessionLog
  proof: TestSessionProof[]
  /** The chat whose agent gathers proof while the session runs. */
  helper?: TestSessionHelper
}

/** Where a session's helper stands. */
export type TestSessionHelperStatus = 'gathering' | 'stopped' | 'not-started'

/** The chat bound to a session that reads the project's data and keeps what the change wrote. */
export type TestSessionHelper = {
  chatContext: ChatContext
  chatContextId: string
  status: TestSessionHelperStatus
  problem?: string
}

/**
 * `GET /api/v1/process-runs/:runId/test-session`: whether a session can be started, and the one
 * kept: the generated `ProcessTestSessionView`, read through `api/testSessionApi.ts`.
 */
export type TestSessionView = {
  runId: string
  /** The group run's id for a leg of one: every leg shares its session. */
  key: string
  offered: boolean
  reason?: string
  session?: TestSession
}

/** What the person asked for that the backend has not answered yet. */
export type TestSessionPending = 'start' | 'stop'

/** One run's test session in the client: what was read, what was asked, and why it went wrong. */
export type TestSessionState = {
  view: TestSessionView | undefined
  pending?: TestSessionPending
  error?: string
}

/** The colour a status, a count or a line reads in: a key of the package's status palette. */
export type TestSessionTone = Extract<
  ProcessStatusTone,
  'working' | 'done' | 'stuck' | 'blocked' | 'empty'
>

/** The block's one button. */
export type TestSessionAction = {
  kind: 'start' | 'stop'
  label: string
  /** True while the person's last ask is unanswered: a press then does nothing. */
  busy: boolean
}

/** A count over the log. */
export type TestSessionCount = {
  key: TestSessionLineKind
  label: string
  value: number
  tone: TestSessionTone
}

/** A log line as the block shows it. */
export type TestSessionLineRow = {
  key: string
  role: string
  kindLabel: string
  tone: TestSessionTone
  text: string
}

/** A proof item as the block shows it. */
export type TestSessionProofRow = {
  key: string
  kindLabel: string
  label: string
  detail?: string
  /** Its source and environment, on one line. */
  meta: string
}

/** The block's line about its helper, and the way to its chat. */
export type TestSessionHelperRow = {
  label: string
  tone: TestSessionTone
  detail?: string
  /** Its chat, as a host opens a chat: the same shape a run's chat opens with. */
  chat: { context: ChatContext; chatContextId: string }
  openLabel: string
}

/** The "Test with me" block, laid out. */
export type TestSessionDisplay = {
  title: string
  headline: string
  tone: TestSessionTone
  /** Why none can start, what went wrong, or where the data is. */
  detail?: string
  error?: string
  action?: TestSessionAction
  open?: { href: string; label: string }
  counts: TestSessionCount[]
  lines: TestSessionLineRow[]
  linesTitle: string
  linesEmpty: string
  /** How many older lines are not shown. */
  linesHidden: number
  proof: TestSessionProofRow[]
  proofTitle: string
  proofEmpty: string
  /** The helper gathering proof, once one was started. */
  helper?: TestSessionHelperRow
  /** Whether the start offers its agent's model chip: before a start, never while one runs. */
  picksAgent: boolean
  /** Whether a session ever ran, so the log and proof are worth showing. */
  showsFindings: boolean
}
