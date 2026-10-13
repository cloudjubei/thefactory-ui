import type { PendingToolGrantDecision } from './chatTypes'

/** The tile a waiting tool's card shows in its header. */
export type ToolAskIcon =
  | 'git'
  | 'merge'
  | 'push'
  | 'package'
  | 'network'
  | 'fetch'
  | 'message'
  | 'file'
  | 'delete'
  | 'run'
  | 'tool'

/** An ordinary ask, or one that throws something away for good. */
export type ToolAskTone = 'ask' | 'danger'

/** The thing a waiting tool's card shows — what it installs, sends, writes, deletes. */
export type ToolAskBody =
  | { kind: 'package'; ecosystem: string; name: string; version?: string }
  | { kind: 'network'; host: string }
  | { kind: 'fetch'; url: string }
  | {
      kind: 'message'
      target: string
      targetProjectId?: string
      message: string
      awaitReply: boolean
    }
  | { kind: 'write'; projectId?: string; path: string; content: string; lines: number }
  | { kind: 'delete-story'; storyId: string; featureId?: string }
  | { kind: 'delete'; what: string }
  | { kind: 'details'; text?: string }
  | { kind: 'git' }
  | { kind: 'launch' }
  | { kind: 'proposal' }

/**
 * Every tool that waits on the person, read as one card: the host's plain
 * sentence of what it wants, the headline, the agent's reason, the thing
 * itself, the consequence where it is not obvious, and a verb on the button.
 */
export type ToolAskCardView = {
  icon: ToolAskIcon
  tone: ToolAskTone
  /** What the agent wants, in the host's words — not the agent's. */
  ask: string
  /** A short tag at the header's end: where it acts, or that it cannot be undone. */
  tag?: string
  headline: string
  /** The agent's own reason, when it gave one. */
  why?: string
  /** What follows from approving, where it is not obvious. */
  consequence?: string
  /** The approve button's verb. */
  verb: string
  body: ToolAskBody
}

/** One place an approval may reach: this once, or always in a place. */
export type ToolAskScopeOption = {
  decision: PendingToolGrantDecision
  label: string
  hint: string
}

/** A decided card folded to one line. */
export type ToolAskDecidedLine = { tone: 'done' | 'declined'; text: string }

/** Whether a launch can start as it stands, and the reason it cannot when there is one to name. */
export type ToolAskLaunchCheck = { ready: boolean; problem?: string }
