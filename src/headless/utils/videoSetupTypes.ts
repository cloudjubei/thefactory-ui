import type { VideoInstallableTool, VideoToolId, VideoToolsReadiness } from 'thefactory-tools/types'
import type { ChatContext } from '../api/generated'
import type { ProcessStatusTone } from './processView'

/** The `videoSetup:progress` event. */
export type VideoSetupProgress = {
  kind: 'install' | 'models'
  tool?: VideoInstallableTool
  output?: string
  receivedBytes?: number
  totalBytes?: number
  done?: boolean
  /** With `done`: it was stopped, neither finished nor failed. */
  stopped?: boolean
  error?: string
}

/** A job running on the machine, as read from it. */
export type VideoSetupRunningJob = Omit<VideoSetupProgress, 'done' | 'stopped' | 'error'>

/** What the machine has, and what is being installed or downloaded on it now. */
export type VideoSetupState = VideoToolsReadiness & { runningJobs?: VideoSetupRunningJob[] }

/** The chat opened for an agent to go through the setup. */
export type VideoSetupChat = {
  context: ChatContext
  chatContextId: string
  turnStarted: boolean
}

type VideoJobStopState = {
  /** Asked to stop, and not yet heard to have ended. */
  stopping?: boolean
  /** Ended by a stop. */
  stopped?: boolean
}

export type VideoInstallJob = VideoJobStopState & {
  running: boolean
  output: string
  error?: string
}

export type VideoModelsJob = VideoJobStopState & {
  running: boolean
  receivedBytes?: number
  totalBytes?: number
  error?: string
}

/** What is being installed or downloaded on the machine, as far as this client has heard. */
export type VideoSetupJobs = {
  install: Partial<Record<VideoInstallableTool, VideoInstallJob>>
  models?: VideoModelsJob
}

export type VideoSetupAction =
  | { kind: 'install'; tool: VideoInstallableTool; label: string }
  | { kind: 'models'; label: string; note: string }

/** Which job a stop is for. */
export type VideoSetupStopTarget =
  | { kind: 'install'; tool: VideoInstallableTool }
  | { kind: 'models' }

/** The Stop on a running row, with what it asks first. */
export type VideoSetupRowStop = {
  target: VideoSetupStopTarget
  ask: string
  label: string
}

export type VideoSetupRowState = 'ok' | 'missing' | 'busy'

export type VideoSetupRow = {
  id: VideoToolId
  label: string
  state: VideoSetupRowState
  status?: string
  /** Why it is not fine as it is, in words; never a command. */
  note?: string
  action?: VideoSetupAction
  stop?: VideoSetupRowStop
  /** An install's live output. */
  output?: string
  /** The models download, as it goes. */
  progress?: { line: string; percent: number }
  error?: string
}

export type VideoSetupGroup = {
  id: 'stills' | 'transcript'
  title: string
  note: string
  badge: string
  tone: ProcessStatusTone
  rows: VideoSetupRow[]
}

export type VideoSetupView = {
  overall: { label: string; tone: ProcessStatusTone }
  groups: VideoSetupGroup[]
  /** Something is left to do, so an agent can be asked to do it. */
  canAskAgent: boolean
  ready: boolean
}

export type { VideoToolsReadiness }
