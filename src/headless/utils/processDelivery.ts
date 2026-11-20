import type {
  ProcessGroupRun,
  ProcessRun,
  ProcessRunPublication,
  ProcessStep,
} from 'thefactory-tools/types'
import { PROCESS_PUBLISH_STEP_ID } from 'thefactory-tools/constants'
import { isProcessPublicationOpen, processPublishBranchName } from 'thefactory-tools/utils'
import {
  PROCESS_DELIVERY_LEG_STATUSES,
  PROCESS_MERGE_ACTIVE_PHASES,
  PROCESS_MERGE_CHECKS_LINK,
  PROCESS_MERGE_FAILED_CHECKS,
  PROCESS_MERGE_OPEN_LABELS,
  PROCESS_MERGE_PHASE_VIEW,
  PROCESS_PUBLICATION_BADGES,
  PROCESS_PUBLICATION_LINK,
  PROCESS_PUBLISH_COPY,
} from './processDeliveryConstants'
import type {
  ProcessDeliveryData,
  ProcessDeliveryRepo,
  ProcessDeliveryTarget,
  ProcessLegPublish,
  ProcessLegPublishBody,
  ProcessLegPublishCard,
  ProcessMergeRow,
  ProcessPublicationView,
  ProcessPublishBody,
  ProcessPublishEdit,
  ProcessPublishRow,
  ProcessPublishView,
} from './processDeliveryTypes'

const isWebLink = (url: string | undefined): url is string =>
  url !== undefined && /^https?:\/\//i.test(url)

/** Whether a run waits at its publish gate, its own and not a nested run's. Pure. */
export function isProcessPublishGate(
  run: Pick<ProcessRun, 'park'> & {
    plan: { steps: readonly Pick<ProcessStep, 'id' | 'kind' | 'gateKind'>[] }
  },
): boolean {
  const park = run.park
  if (!park || park.reason !== 'gate' || park.childRunId !== undefined) return false
  const step = run.plan.steps.find((s) => s.id === park.stepId)
  return (
    step?.kind === 'gate' && (step.gateKind === 'publish' || step.id === PROCESS_PUBLISH_STEP_ID)
  )
}

/** Whether a group run waits for its legs to be published. Pure. */
export function isGroupPublishPark(group: Pick<ProcessGroupRun, 'status' | 'park'>): boolean {
  return group.status === 'parked' && group.park?.reason === 'publish'
}

/** Whether a group run has a delivery to read: it waits to publish, or a leg is past its outputs. Pure. */
export function processGroupReadsDelivery(
  group: Pick<ProcessGroupRun, 'status' | 'park' | 'legs'>,
): boolean {
  return (
    isGroupPublishPark(group) ||
    group.legs.some((leg) => PROCESS_DELIVERY_LEG_STATUSES.includes(leg.status))
  )
}

/** The address a delivery is read and written at, under `/api/v1`. Pure. */
export function processDeliveryPath(target: ProcessDeliveryTarget): string {
  return target.kind === 'run'
    ? `/process-runs/${encodeURIComponent(target.runId)}`
    : `/process-group-runs/${encodeURIComponent(target.groupRunId)}`
}

/** The publish card's fields as the host proposes them, by project id. Pure. */
export function processPublishEdits(data: ProcessDeliveryData): Record<string, ProcessPublishEdit> {
  return Object.fromEntries(
    data.repos.map((repo) => [repo.projectId, { short: repo.short, prTitle: repo.prTitle }]),
  )
}

/**
 * The edits to keep over a new read: the person's own where they changed a
 * field, the host's anywhere else. Pure.
 */
export function mergeProcessPublishEdits(
  previous: ProcessDeliveryData | undefined,
  edits: Readonly<Record<string, ProcessPublishEdit>>,
  next: ProcessDeliveryData,
): Record<string, ProcessPublishEdit> {
  const before = previous ? processPublishEdits(previous) : {}
  return Object.fromEntries(
    next.repos.map((repo) => {
      const was = before[repo.projectId]
      const edit = edits[repo.projectId]
      const keep = (field: keyof ProcessPublishEdit) =>
        edit && was && edit[field] !== was[field] ? edit[field] : repo[field]
      return [repo.projectId, { short: keep('short'), prTitle: keep('prTitle') }]
    }),
  )
}

const editOf = (
  repo: ProcessDeliveryRepo,
  edits: Readonly<Record<string, ProcessPublishEdit>>,
): ProcessPublishEdit => edits[repo.projectId] ?? { short: repo.short, prTitle: repo.prTitle }

function publishRow(repo: ProcessDeliveryRepo, edit: ProcessPublishEdit): ProcessPublishRow {
  const named = processPublishBranchName(repo.branchTemplate, {
    ...(repo.ticket ? { ticket: repo.ticket } : {}),
    short: edit.short,
    runId: repo.runId,
  })
  return {
    projectId: repo.projectId,
    name: repo.name,
    baseBranch: repo.baseBranch,
    short: edit.short,
    prTitle: edit.prTitle,
    ...('branch' in named ? { branch: named.branch } : { branchError: named.error }),
    ...(repo.changed && !edit.prTitle.trim() ? { titleError: PROCESS_PUBLISH_COPY.noTitle } : {}),
    ...(repo.account ? { account: repo.account } : {}),
    changed: repo.changed,
    ...(repo.notices?.length ? { notices: repo.notices } : {}),
  }
}

/**
 * The publish card: each repo with the branch name its short name makes and
 * its pull request's title, who it is pushed as, and whether Publish can be
 * pressed — some repo has changes and every one that does names a branch and
 * a title. Pure.
 */
export function processPublishView(
  data: ProcessDeliveryData,
  edits: Readonly<Record<string, ProcessPublishEdit>>,
  opts: { publishing: boolean; error?: string | null },
): ProcessPublishView {
  const rows = data.repos.map((repo) => publishRow(repo, editOf(repo, edits)))
  const changed = rows.filter((row) => row.changed)
  const accounts = [...new Set(changed.map((row) => row.account))]
  const account = accounts.length === 1 ? accounts[0] : undefined
  const noAccount = changed.some((row) => !row.account)
  const ready = changed.length > 0 && changed.every((row) => row.branch && !row.titleError)
  return {
    title: PROCESS_PUBLISH_COPY.title,
    line: PROCESS_PUBLISH_COPY.line(changed.length),
    rows,
    ...(account ? { account } : {}),
    noAccount,
    publishing: opts.publishing,
    canPublish: ready && !noAccount && !opts.publishing,
    ...(opts.error ? { error: opts.error } : {}),
  }
}

/** Whether the person changed any field the host proposed. Pure. */
export function processPublishEditsChanged(
  data: ProcessDeliveryData,
  edits: Readonly<Record<string, ProcessPublishEdit>>,
): boolean {
  return data.repos.some((repo) => {
    const edit = editOf(repo, edits)
    return edit.short.trim() !== repo.short || edit.prTitle.trim() !== repo.prTitle
  })
}

/** The edits as they are sent: every repo with changes, its fields trimmed. Pure. */
export function processPublishBody(
  data: ProcessDeliveryData,
  edits: Readonly<Record<string, ProcessPublishEdit>>,
): ProcessPublishBody {
  return {
    repos: data.repos
      .filter((repo) => repo.changed)
      .map((repo) => {
        const edit = editOf(repo, edits)
        return { projectId: repo.projectId, short: edit.short.trim(), prTitle: edit.prTitle.trim() }
      }),
  }
}

/** One leg of a group run published on its own: its repo and that repo's edits; `undefined` for a repo the delivery does not hold. Pure. */
export function processLegPublishBody(
  data: ProcessDeliveryData,
  edits: Readonly<Record<string, ProcessPublishEdit>>,
  projectId: string,
): ProcessLegPublishBody | undefined {
  const repo = data.repos.find((r) => r.projectId === projectId)
  if (!repo) return undefined
  return { projectId, ...processPublishBody({ repos: [repo] }, edits) }
}

/**
 * One leg's publish card on its group run's page: that repo alone, locked
 * while it goes and with why when refused; `undefined` once sent, or for a
 * repo the delivery does not hold. Pure.
 */
export function processLegPublishCard(
  data: ProcessDeliveryData | undefined,
  edits: Readonly<Record<string, ProcessPublishEdit>>,
  projectId: string,
  leg: ProcessLegPublish | undefined,
): ProcessLegPublishCard | undefined {
  if (leg?.phase === 'sent') return undefined
  if (!data) return { view: undefined }
  const repo = data.repos.find((r) => r.projectId === projectId)
  if (!repo) return undefined
  return {
    view: processPublishView({ repos: [repo] }, edits, {
      publishing: leg?.phase === 'publishing',
      error: leg?.error ?? null,
    }),
  }
}

/**
 * A run's published work as a badge and a link: "In review" while its pull
 * request is open, then merged or closed; the pull request, else nothing to
 * open. `undefined` for a run not published. Pure.
 */
export function processPublicationView(
  publication: ProcessRunPublication | undefined,
): ProcessPublicationView | undefined {
  if (!publication) return undefined
  const pr = publication.pullRequest
  return {
    inReview: isProcessPublicationOpen(publication),
    badge: PROCESS_PUBLICATION_BADGES[publication.status],
    ...(pr && isWebLink(pr.url)
      ? { link: { label: PROCESS_PUBLICATION_LINK(pr.number), url: pr.url } }
      : {}),
    branch: publication.remoteBranch,
  }
}

/** One repo's publication in a delivery, by its leg or project. Pure. */
export function processDeliveryRepoOf(
  data: ProcessDeliveryData | undefined,
  key: { legId?: string; projectId: string },
): ProcessDeliveryRepo | undefined {
  return data?.repos.find((repo) =>
    key.legId && repo.legId ? repo.legId === key.legId : repo.projectId === key.projectId,
  )
}

/** Whether a merge is still on its way in some repo: it is read again until none is. Pure. */
export function processMergeActive(data: ProcessDeliveryData | undefined): boolean {
  return (data?.repos ?? []).some(
    (repo) => repo.merge !== undefined && PROCESS_MERGE_ACTIVE_PHASES.includes(repo.merge.phase),
  )
}

function mergeLine(repo: ProcessDeliveryRepo): string | undefined {
  const merge = repo.merge!
  if (merge.phase === 'checks-failed' && merge.failedChecks && merge.failedChecks.length > 0) {
    return PROCESS_MERGE_FAILED_CHECKS(merge.failedChecks)
  }
  return merge.error ?? PROCESS_MERGE_PHASE_VIEW[merge.phase].line
}

/**
 * Each repo's merge after Accept, in the order the host merges them: where it
 * stands, its pull request and checks, and — where something waits on its run
 * — what opening it is for. Repos not merging yet are left out. Pure.
 */
export function processMergeRows(data: ProcessDeliveryData | undefined): ProcessMergeRow[] {
  return (data?.repos ?? []).flatMap((repo): ProcessMergeRow[] => {
    const merge = repo.merge
    if (!merge) return []
    const phase = PROCESS_MERGE_PHASE_VIEW[merge.phase]
    const pr = repo.publication?.pullRequest
    const line = mergeLine(repo)
    const openLabel = PROCESS_MERGE_OPEN_LABELS[merge.phase]
    return [
      {
        projectId: repo.projectId,
        runId: repo.runId,
        ...(repo.legId ? { legId: repo.legId } : {}),
        name: repo.name,
        label: phase.label,
        tone: phase.tone,
        ...(line ? { line } : {}),
        active: PROCESS_MERGE_ACTIVE_PHASES.includes(merge.phase),
        ...(pr && isWebLink(pr.url)
          ? { link: { label: PROCESS_PUBLICATION_LINK(pr.number), url: pr.url } }
          : {}),
        ...(isWebLink(merge.checksUrl)
          ? { checksLink: { label: PROCESS_MERGE_CHECKS_LINK, url: merge.checksUrl } }
          : {}),
        ...(openLabel ? { openLabel } : {}),
        canResolve: merge.phase === 'conflict',
      },
    ]
  })
}
