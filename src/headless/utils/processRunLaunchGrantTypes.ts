import type { StartProcessRunData } from '../api/generated'

/** What an agent's `startProcessRun` names. */
export type ProcessRunGrantSummary = {
  processId?: string
  inputValues: Readonly<Record<string, unknown>>
  title?: string
  note?: string
  baseBranch?: string
  runner?: 'api' | 'cli'
  cliTool?: string
  cliModel?: string
  cliCredentialId?: string
  turnLimit?: unknown
}

/** A process's launch opened from a page rather than asked for by an agent. */
export type ProcessRunLaunchGrantInput = {
  processId: string
  /** The agent the person's chats run on: what the run uses unless picked on the card. */
  chatRunner: 'api' | 'cli'
  /** That agent as a launch carries it; the card's picks win. */
  agent?: Record<string, unknown>
  /** Launch with the card's picks. */
  onLaunch: (metadata: Record<string, unknown>) => Promise<void>
  /** Close the card without launching. */
  onCancel: () => void
}

/** The body of `POST /process-runs`. */
export type ProcessRunStartBody = StartProcessRunData['body']
