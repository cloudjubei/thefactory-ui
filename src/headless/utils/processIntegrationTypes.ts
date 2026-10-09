import type { MergeChecks, ProcessIntegrationMode } from 'thefactory-tools/types'
import type { ProcessStatusTone } from './processView'

/** One way to bring approved work in, as the sign-off offers it. */
export interface ProcessIntegrationChoice {
  mode: ProcessIntegrationMode
  /** The button. */
  label: string
  /** One plain line on what it does. */
  detail: string
}

/** What bringing a run's approved work in came to, arranged for one render. */
export interface ProcessIntegrationView {
  tone: ProcessStatusTone
  title: string
  /** The reason it failed, or what to do next. */
  detail?: string
  /** The commit it landed or pushed, in full — the chip that shows it shortens it. */
  sha?: string
  /** A page to open in the browser: the pull request, or where to open one. */
  link?: { url: string; label: string }
  /** The work conflicts with its base branch in these files — an agent can be sent to resolve them. */
  conflict?: { baseRef: string; paths: string[] }
  /** The files a conflict on landing is being, or was, resolved in. */
  files?: string[]
  /** How the merged result's build and type check went, when the landing asked for them. */
  checks?: MergeChecks
  /** The work did not land — the sign-off offers to try again. */
  canRetry: boolean
  /** It is happening now. */
  busy: boolean
}
