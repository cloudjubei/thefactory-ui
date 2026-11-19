import type { ProcessProposal, ProcessWaitFor, ProcessWaitForHow } from 'thefactory-tools/types'
import { processWaitForLabels, processWaitsForOf } from 'thefactory-tools/utils'

import {
  PROCESS_WAIT_FOR_COMMIT,
  PROCESS_WAIT_FOR_KIND_LABELS,
  PROCESS_WAIT_FOR_LAUNCH_COPY,
  PROCESS_WAIT_FOR_LINK,
  PROCESS_WAIT_FOR_ROW_KEY,
} from './processWaitForDraftConstants'
import type {
  LaunchLegWaitsForMetadata,
  LaunchWaitsForMetadata,
  ProcessWaitForDraft,
  ProcessWaitForDraftRow,
  ProcessWaitForDrafts,
} from './processWaitForDraftTypes'

const TARGET_FIELD: Record<ProcessWaitForHow, 'branch' | 'commit' | 'pullRequestUrl'> = {
  branch: 'branch',
  commit: 'commit',
  'pull-request': 'pullRequestUrl',
}

/** What a typed target is by its shape: a link is a pull request, a hex id a commit, anything else a branch. Pure. */
export function processWaitForTargetKind(target: string): ProcessWaitForHow | undefined {
  const text = target.trim()
  if (!text) return undefined
  if (PROCESS_WAIT_FOR_LINK.test(text)) return 'pull-request'
  return PROCESS_WAIT_FOR_COMMIT.test(text) ? 'commit' : 'branch'
}

/** One row as the launch names it, trimmed — nothing for a row with nothing in it. Pure. */
export function processWaitForOfDraft(draft: ProcessWaitForDraft): ProcessWaitFor | undefined {
  const label = draft.label.trim()
  const target = draft.target.trim()
  if (!label && !target) return undefined
  const kind = processWaitForTargetKind(target)
  return {
    label,
    ...(kind ? { [TARGET_FIELD[kind]]: target } : {}),
    ...(draft.projectId ? { projectId: draft.projectId } : {}),
  }
}

/** Every filled row, as the launch names it. Pure. */
export function processWaitsForOfDrafts(drafts: ProcessWaitForDrafts): ProcessWaitFor[] {
  return drafts.rows.flatMap((row) => {
    const entry = processWaitForOfDraft(row)
    return entry ? [entry] : []
  })
}

/** What is wrong with the rows, in the words the launch refuses them with. Pure. */
export function processWaitForDraftsProblem(drafts: ProcessWaitForDrafts): string | undefined {
  const read = processWaitsForOf(processWaitsForOfDrafts(drafts))
  return 'error' in read ? read.error : undefined
}

/** The rows a card starts from: what the launch already names, unchanged. Pure. */
export function processWaitForDraftsOf(
  waitsFor: readonly ProcessWaitFor[] | undefined,
): ProcessWaitForDrafts {
  const rows = (waitsFor ?? []).map(
    (entry, at): ProcessWaitForDraft => ({
      key: `${PROCESS_WAIT_FOR_ROW_KEY}${at}`,
      label: entry.label,
      target: entry.branch ?? entry.commit ?? entry.pullRequestUrl ?? '',
      ...(entry.projectId ? { projectId: entry.projectId } : {}),
    }),
  )
  return { rows, nextKey: rows.length, edited: false }
}

/** The rows with an empty one added. Pure. */
export function addProcessWaitForDraft(drafts: ProcessWaitForDrafts): ProcessWaitForDrafts {
  return {
    rows: [
      ...drafts.rows,
      { key: `${PROCESS_WAIT_FOR_ROW_KEY}${drafts.nextKey}`, label: '', target: '' },
    ],
    nextKey: drafts.nextKey + 1,
    edited: true,
  }
}

/** The rows with one changed by its key; a project set back to the run's own is taken off. Pure. */
export function updateProcessWaitForDraft(
  drafts: ProcessWaitForDrafts,
  key: string,
  change: Partial<Omit<ProcessWaitForDraft, 'key'>>,
): ProcessWaitForDrafts {
  return {
    ...drafts,
    rows: drafts.rows.map((row) => {
      if (row.key !== key) return row
      const { projectId, ...rest } = { ...row, ...change }
      return projectId ? { ...rest, projectId } : rest
    }),
    edited: true,
  }
}

/** The rows with one taken off by its key. Pure. */
export function removeProcessWaitForDraft(
  drafts: ProcessWaitForDrafts,
  key: string,
): ProcessWaitForDrafts {
  return { ...drafts, rows: drafts.rows.filter((row) => row.key !== key), edited: true }
}

/** The rows as the card draws them, each saying what its target was read as. Pure. */
export function processWaitForDraftRows(drafts: ProcessWaitForDrafts): ProcessWaitForDraftRow[] {
  return drafts.rows.map((row) => {
    const kind = processWaitForTargetKind(row.target)
    return kind ? { ...row, kind, kindLabel: PROCESS_WAIT_FOR_KIND_LABELS[kind] } : { ...row }
  })
}

/** What the launch's decision says of its wait: the rows, once the person changed them. Pure. */
export function launchWaitsForMetadata(drafts: ProcessWaitForDrafts): LaunchWaitsForMetadata {
  return drafts.edited ? { waitsFor: processWaitsForOfDrafts(drafts) } : {}
}

/** What a group launch's decision says of each leg's wait: every leg the person changed, by project. Pure. */
export function launchLegWaitsForMetadata(
  byProject: Readonly<Record<string, ProcessWaitForDrafts>>,
): LaunchLegWaitsForMetadata {
  const edited = Object.entries(byProject).filter(([, drafts]) => drafts.edited)
  if (edited.length === 0) return {}
  return {
    legWaitsFor: Object.fromEntries(
      edited.map(([projectId, drafts]) => [projectId, processWaitsForOfDrafts(drafts)]),
    ),
  }
}

/** Where the launch preview put the run's wait: what it waits for, at which step, before which. Pure. */
export function processProposalWaitLine(
  proposal: Pick<ProcessProposal, 'waitsFor' | 'steps'> | undefined,
): string | undefined {
  if (!proposal?.waitsFor?.length) return undefined
  const labels = processWaitForLabels(proposal.waitsFor)
  const at = proposal.steps.findIndex((node) => node.waitsForWork)
  if (at < 0) return PROCESS_WAIT_FOR_LAUNCH_COPY.beforeProof(labels)
  return PROCESS_WAIT_FOR_LAUNCH_COPY.stepLine(
    labels,
    proposal.steps[at]!.name,
    proposal.steps[at + 1]?.name,
  )
}
