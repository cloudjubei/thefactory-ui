import type { ProcessGroupRun, ProcessRun } from 'thefactory-tools/types'
import type { ProcessStatusTone } from './processView'

/** What a run working a ticket is: its review, its group story's group run, or a part story's own run. */
export type TicketRunKind = 'review' | 'group' | 'story'

/** What opening a ticket's run opens: a project's run, or a group story's group run. */
export type TicketRunOpen =
  | { kind: 'run'; projectId: string; runId: string }
  | { kind: 'group-run'; groupRunId: string; groupStoryId: string }

/** The run working a ticket, as its row and its page say it. */
export interface TicketRunState {
  kind: TicketRunKind
  /** "Review run". */
  name: string
  /** "Waiting for you: Approve the push", "Merge", "Failed at Merge". */
  state: string
  /** The name and the state in one line. */
  label: string
  /** More of it, on hover: the Processes list's line for the run. */
  hint: string
  /** The run's badge tone, which its dot is drawn in. */
  tone: ProcessStatusTone
  /** It waits on the person: drawn emphasised. */
  asks: boolean
  /** It is working. */
  live: boolean
  open: TicketRunOpen
}

/** A ticket as its run is found: by its key, and by its group story and that story's parts. */
export interface TicketRunSubject {
  key: string
  statusCategory?: string | undefined
  groupStory?:
    | { id: string; parts?: readonly { projectId: string; storyId: string }[] | undefined }
    | undefined
}

/** The runs of one group, read once for a whole list, each list newest first. */
export interface TicketRunIndex {
  /** Review runs by ticket key, in capitals. */
  reviews: ReadonlyMap<string, readonly ProcessRun[]>
  /** A story's own runs by `projectId/storyId`; a group run's legs are left out. */
  stories: ReadonlyMap<string, readonly ProcessRun[]>
  /** Group runs by group story. */
  groupRuns: ReadonlyMap<string, readonly ProcessGroupRun[]>
}

/** How a ticket's row shows the run working it: a line under the row, a chip among its chips, or a dot and words as the Processes list draws a run. */
export type TicketRunLayout = 'line' | 'chip' | 'dot'
