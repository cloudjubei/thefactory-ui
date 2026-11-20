import type { ProcessGroupRun, ProcessRun } from 'thefactory-tools/types'
import { reviewMergeProgressLine } from './colleagueReviewMerge'
import type { ReviewMergeJob } from './colleagueReviewMergeTypes'
import { reviewOfChat } from './colleagueReviewStart'
import { processGroupBadge, processGroupCardView, processGroupLiveState } from './processGroupView'
import { isOutsideWaitPending, processOutsideWaitView } from './processOutsideWait'
import { processRunAttentionSection, processRunNeedLine } from './processRunAttention'
import { isProcessRunActive, isProcessRunCurrent } from './processRunCurrent'
import { processRunBadge } from './processView'
import { PROCESS_RUN_WORDS } from './processViewConstants'
import { TICKET_RUN_NAMES, TICKET_RUN_TEXT } from './ticketRunStateConstants'
import type {
  TicketRunIndex,
  TicketRunKind,
  TicketRunOpen,
  TicketRunState,
  TicketRunSubject,
} from './ticketRunStateTypes'

const DONE_CATEGORY = 'done'

const storyKey = (projectId: string, storyId: string) => `${projectId}/${storyId}`

function add<T>(map: Map<string, T[]>, key: string, value: T): void {
  const held = map.get(key)
  if (held) held.push(value)
  else map.set(key, [value])
}

/** The ticket a run reviews in the group, by its subject, else by its review chat. */
function reviewedTicket(run: ProcessRun, groupId: string): string | null | undefined {
  const subject = run.ticketReview ?? reviewOfChat(run.chatContextId)
  if (!subject) return undefined
  return subject.groupId === groupId ? subject.ticketKey.toUpperCase() : null
}

/**
 * One group's runs, sorted out once for a whole list of its tickets: review
 * runs by the ticket they review, a story's own runs by its project and story
 * (a group run's legs speak through their group run), and group runs by their
 * group story. Each list keeps the order given, newest first. Pure.
 */
export function ticketRunIndex(
  groupId: string,
  runs: readonly ProcessRun[],
  groupRuns: readonly ProcessGroupRun[],
): TicketRunIndex {
  const reviews = new Map<string, ProcessRun[]>()
  const stories = new Map<string, ProcessRun[]>()
  for (const run of runs) {
    const ticketKey = reviewedTicket(run, groupId)
    if (ticketKey) add(reviews, ticketKey, run)
    else if (ticketKey === undefined && run.storyId && !run.groupRunId) {
      add(stories, storyKey(run.projectId, run.storyId), run)
    }
  }
  const byStory = new Map<string, ProcessGroupRun[]>()
  for (const group of groupRuns) {
    if (group.groupId === groupId && group.groupStoryId) add(byStory, group.groupStoryId, group)
  }
  return { reviews, stories, groupRuns: byStory }
}

const stepName = (run: ProcessRun, stepId: string | undefined): string | undefined =>
  run.plan.steps.find((step) => step.id === stepId)?.name

function failedStep(run: ProcessRun): string | undefined {
  const failed = [...run.ledger]
    .reverse()
    .find((entry) => entry.outcome === 'failed' || entry.outcome === 'errored')
  return stepName(run, run.park?.stepId ?? failed?.stepId ?? run.cursor?.stepId)
}

type Said = Pick<TicketRunState, 'state' | 'tone' | 'asks' | 'live'>

function saidOfRun(run: ProcessRun, now: number): Said {
  const { tone } = processRunBadge(run, now)
  if (!isProcessRunCurrent(run)) {
    const step = failedStep(run)
    return {
      state: step ? TICKET_RUN_TEXT.failedAt(step) : PROCESS_RUN_WORDS.failed,
      tone,
      asks: false,
      live: false,
    }
  }
  const park = run.park
  if (isOutsideWaitPending(park) && park?.ask?.outside) {
    return {
      state: TICKET_RUN_TEXT.waitingFor(park.ask.outside.awaits),
      tone: 'queued',
      asks: false,
      live: false,
    }
  }
  const arrived = processOutsideWaitView(run)
  if (arrived?.kind === 'arrived') {
    return {
      state: TICKET_RUN_TEXT.waitingForYouAt(arrived.carryOnLabel),
      tone,
      asks: true,
      live: false,
    }
  }
  const section = processRunAttentionSection(run, now)
  const line = processRunNeedLine(run, now) ?? PROCESS_RUN_WORDS.needsYou
  if (section === 'needs-you' || section === 'sign-off') {
    const step = park?.reason === 'gate' ? stepName(run, park.stepId) : undefined
    return {
      state: step ? TICKET_RUN_TEXT.waitingForYouAt(step) : line,
      tone,
      asks: true,
      live: false,
    }
  }
  return { state: line, tone, asks: false, live: section === 'running' || section === 'merging' }
}

function saidOfGroupRun(group: ProcessGroupRun): Said {
  const { tone } = processGroupBadge(group)
  switch (processGroupLiveState(group)) {
    case 'sign-off':
      return {
        state: TICKET_RUN_TEXT.waitingForYouAt(PROCESS_RUN_WORDS.signOff),
        tone,
        asks: true,
        live: false,
      }
    case 'needs-you':
      return { state: TICKET_RUN_TEXT.waitingForYou, tone, asks: true, live: false }
    case 'waiting':
      return { state: PROCESS_RUN_WORDS.waiting, tone, asks: false, live: false }
    case 'running':
      return { state: PROCESS_RUN_WORDS.running, tone, asks: false, live: true }
    default:
      return { state: PROCESS_RUN_WORDS.failed, tone, asks: false, live: false }
  }
}

function stateOf(
  kind: TicketRunKind,
  said: Said,
  hint: string,
  open: TicketRunOpen,
): TicketRunState {
  const name = TICKET_RUN_NAMES[kind]
  return {
    kind,
    name,
    ...said,
    label: TICKET_RUN_TEXT.line(name, said.state),
    hint,
    open,
  } as TicketRunState
}

/** The run a list of them shows for a ticket: the first still current, else the newest when it failed. */
function shownOf<T extends { status: ProcessRun['status'] }>(
  runs: readonly T[] | undefined,
  isCurrent: (run: T) => boolean,
  done: boolean,
): T | undefined {
  if (!runs?.length) return undefined
  const current = runs.find(isCurrent)
  if (current) return current
  return !done && runs[0].status === 'failed' ? runs[0] : undefined
}

type Candidate = { state: TicketRunState; at: number }

/** A review run working while its round's merge runs: the merge in one line. */
function merging(run: ProcessRun, merge: ReviewMergeJob | undefined): Said | undefined {
  if (run.status !== 'running' || merge?.state !== 'running') return undefined
  if (merge.round !== run.ticketReview?.round) return undefined
  return { state: reviewMergeProgressLine(merge), tone: 'working', asks: false, live: true }
}

function runCandidate(
  kind: TicketRunKind,
  runs: readonly ProcessRun[] | undefined,
  done: boolean,
  now: number,
  merge?: ReviewMergeJob,
): Candidate[] {
  const run = shownOf(runs, isProcessRunCurrent, done)
  if (!run) return []
  const said = merging(run, merge) ?? saidOfRun(run, now)
  const open: TicketRunOpen = { kind: 'run', projectId: run.projectId, runId: run.id }
  return [
    {
      state: stateOf(kind, said, processRunNeedLine(run, now) ?? said.state, open),
      at: run.updatedAt,
    },
  ]
}

function groupCandidate(
  groupStoryId: string,
  groups: readonly ProcessGroupRun[] | undefined,
  done: boolean,
): Candidate[] {
  const group = shownOf(groups, isProcessRunActive, done)
  if (!group) return []
  const card = processGroupCardView(group)
  const open: TicketRunOpen = { kind: 'group-run', groupRunId: group.id, groupStoryId }
  return [
    {
      state: stateOf('group', saidOfGroupRun(group), card.body?.text ?? card.sub, open),
      at: group.updatedAt,
    },
  ]
}

const rank = ({ state }: Candidate) =>
  state.asks ? 0 : state.live ? 1 : state.tone === 'stuck' ? 3 : 2

/**
 * The run working a ticket, in short words: its review run, its group story's
 * group run, or a part story's own run — whichever waits on the person, else
 * whichever works, else one that only waits, else the newest that failed,
 * the newest first among equals. A run still current (`isProcessRunCurrent`)
 * shows; one that ended shows only when it is the newest and failed, and not
 * once the ticket is done — a run that went well or was stopped never
 * lingers. A review run working while its round's merge runs says the merge
 * (`merges` by ticket key, in capitals). `undefined` when no run works it. Pure.
 */
export function ticketRunState(
  ticket: TicketRunSubject,
  index: TicketRunIndex,
  now: number,
  merges: Readonly<Record<string, ReviewMergeJob>> = {},
): TicketRunState | undefined {
  const done = ticket.statusCategory === DONE_CATEGORY
  const story = ticket.groupStory
  const key = ticket.key.toUpperCase()
  const candidates = [
    ...runCandidate('review', index.reviews.get(key), done, now, merges[key]),
    ...(story?.parts ?? []).flatMap((part) =>
      runCandidate('story', index.stories.get(storyKey(part.projectId, part.storyId)), done, now),
    ),
    ...(story ? groupCandidate(story.id, index.groupRuns.get(story.id), done) : []),
  ]
  return candidates.sort((a, b) => rank(a) - rank(b) || b.at - a.at)[0]?.state
}

/** The tickets whose review run works now: only theirs is a merge worth reading. Pure. */
export function ticketRunMergeKeys(index: TicketRunIndex): string[] {
  return [...index.reviews].flatMap(([key, runs]) =>
    runs.find(isProcessRunCurrent)?.status === 'running' ? [key] : [],
  )
}
