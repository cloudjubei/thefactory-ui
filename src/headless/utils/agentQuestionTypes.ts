// Shapes behind a mid-run `askUser` question: the parsed payload the question
// card renders, and the decision body sent back to the CLI action broker.

import type { AskUserAnswerKind } from 'thefactory-tools/types'

/** One of the agent's suggested answers, as the card offers it. */
export type AgentQuestionOption = {
  /** The answer itself — what is sent back when it is picked. */
  label: string
  /** One line of what picking it means. */
  detail?: string
  /** The agent's own pick — at most one option carries it. */
  recommended?: true
}

/** A kind of answer the card can offer a picker for — every answer kind but plain text. */
export type QuestionPickerKind = Exclude<AskUserAnswerKind, 'text'>

/**
 * A question a sandboxed CLI agent raised mid-run through `askUser`, parsed
 * defensively out of the broker action's `unknown` payload.
 */
export type AgentQuestion = {
  /** The question to put to the user. Falls back to a generic prompt when the payload carries none. */
  question: string
  /** Extra background the agent supplied to make the question answerable. */
  context?: string
  /** Suggested answers, each sent in one click. */
  options?: AgentQuestionOption[]
  /** The kind of answer wanted, when the card can offer a picker of the real items of that kind. */
  answerKind?: QuestionPickerKind
  /**
   * The payload exactly as received, kept only when it could not be parsed into
   * a question — so the card can show what the agent actually sent instead of
   * hiding it behind the fallback prompt.
   */
  raw?: unknown
}

/**
 * Body for `decideCliAgentAction` when resolving a question action. The answer
 * rides in `metadata`, which the broker hands back to the waiting agent.
 */
export type AgentQuestionDecision = {
  outcome: 'approved' | 'denied'
  /** A question is answered on its own card. */
  decidedVia: 'card'
  /** The answer, and the project files handed over with it, project-relative. */
  metadata: { answer: string; files?: string[] }
}

/** One item a question's picker offers — a branch, a file, a story, … */
export type QuestionPickerItem = {
  /** Stable key within the list. */
  id: string
  /** What the row shows first. */
  label: string
  /** A second line: what it is, when it changed. */
  detail?: string
  /** A short tag at the row's end — a story's status, a branch's "current". */
  tag?: string
  /** The answer sent when this item is picked. */
  answer: string
  /** The agent named it among its options as its own pick. */
  recommended?: true
}

/**
 * Who settled an answered question, as its bubble says it: the person in
 * their own words or by a pick, or by handing it back to the agent.
 */
export type AnsweredQuestionBy = 'answered' | 'agent-decides'

/** A question already answered, folded to the question and its answer. */
export type AnsweredQuestionView = {
  question: string
  /** The answer that was sent, absent when the agent was left to decide. */
  answer?: string
  by: AnsweredQuestionBy
}

/** A branch as a picker reads it. */
export type PickerBranch = {
  name: string
  isLocal?: boolean
  current?: boolean
  isDefault?: boolean
}

/** A feature as a picker reads it. */
export type PickerFeature = { id: string; title?: string; status?: string; index?: number }

/** A story as a picker reads it, with its features for a feature picker. */
export type PickerStory = {
  id: string
  title?: string
  status?: string
  index?: number
  features?: PickerFeature[]
}

/** A project as a picker reads it. */
export type PickerProject = { id: string; title: string }

/** A chat as a picker reads it: its key and the title it shows under. */
export type PickerChat = { key: string; title: string; detail?: string }

/** A process as a picker reads it. */
export type PickerProcess = { id: string; name: string; description?: string }
