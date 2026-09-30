import type { ProcessIntegrationMode } from 'thefactory-tools/types'
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
  /** The commit it landed or pushed, shortened. */
  sha?: string
  /** A page to open in the browser: the pull request, or where to open one. */
  link?: { url: string; label: string }
  /** The work did not land — the sign-off offers to try again. */
  canRetry: boolean
  /** It is happening now. */
  busy: boolean
}
