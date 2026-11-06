import type { ProcessRun } from 'thefactory-tools/types'
import { CHECK_METHOD_LABELS, PROJECT_CHECK_METHOD } from './checkMethodConstants'
import {
  GROUP_MEMBER_SECTIONS,
  GROUP_RUN_STATUS_ORDER,
  GROUP_STATUS_COPY,
} from './groupStatusViewConstants'
import type {
  GroupMemberAttention,
  GroupMemberCheck,
  GroupMemberGit,
  GroupMemberProgress,
  GroupMemberRunRow,
  GroupMemberView,
  GroupRunRow,
  GroupStatusBadge,
  GroupStatusView,
  ProjectsGroupMemberStatus,
  ProjectsGroupStatus,
} from './groupStatusViewTypes'
import { processRunListRow } from './processRunAttention'
import { PROCESS_RUN_ATTENTION_SECTIONS } from './processRunAttentionConstants'
import type { ProcessRunAttentionSectionId } from './processRunAttentionTypes'
import { PROCESS_RUN_STATUS_VIEW } from './processView'
import { timeAgo } from './time'

type WorkCounts = ProjectsGroupMemberStatus['storyProgress']['stories']
type OpenRequest = ProjectsGroupMemberStatus['openRequests'][number]
type SectionCounts = Partial<Record<ProcessRunAttentionSectionId, number>>

const SECTION_ORDER = PROCESS_RUN_ATTENTION_SECTIONS.map((section) => section.id)

const isUnaccepted = (request: OpenRequest): boolean => request.status === 'pending'

const countsTotal = (counts: WorkCounts): number =>
  counts.pending + counts.in_progress + counts.reviewable + counts.done + counts.blocked

/** A member's stories and features done, over what counts: deferred work does not. Pure. */
export function groupMemberProgress(
  progress: ProjectsGroupMemberStatus['storyProgress'],
): GroupMemberProgress | undefined {
  const stories = countsTotal(progress.stories)
  const features = countsTotal(progress.features)
  if (stories === 0 && features === 0) return undefined
  const measured =
    features > 0 ? progress.features.done / features : progress.stories.done / stories
  return {
    ...(stories > 0 ? { stories: GROUP_STATUS_COPY.stories(progress.stories.done, stories) } : {}),
    ...(features > 0
      ? { features: GROUP_STATUS_COPY.features(progress.features.done, features) }
      : {}),
    percent: Math.round(measured * 100),
  }
}

function memberRunRows(
  projectId: string,
  runs: readonly ProcessRun[] | undefined,
  now: number,
): GroupMemberRunRow[] {
  const rows: GroupMemberRunRow[] = []
  for (const run of runs ?? []) {
    if (run.projectId !== projectId) continue
    const row = processRunListRow(run, now)
    if (!row.section) continue
    rows.push({
      id: run.id,
      projectId,
      title: row.title,
      line: row.line,
      tone: row.tone,
      section: row.section,
    })
  }
  return rows.sort((a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section))
}

function runCounts(
  member: ProjectsGroupMemberStatus,
  rows: readonly GroupMemberRunRow[],
  runsRead: boolean,
): SectionCounts {
  if (!runsRead) {
    return { 'needs-you': member.runs.parked.length, running: member.runs.running.length }
  }
  const counts: SectionCounts = {}
  for (const row of rows) counts[row.section] = (counts[row.section] ?? 0) + 1
  return counts
}

/** The member's runs, with what waits on the person outside a run counted in Needs you. */
function sectionCounts(
  member: ProjectsGroupMemberStatus,
  rows: readonly GroupMemberRunRow[],
  runsRead: boolean,
): SectionCounts {
  const counts = runCounts(member, rows, runsRead)
  const waiting = member.failingChecks.length + member.openRequests.filter(isUnaccepted).length
  return waiting > 0 ? { ...counts, 'needs-you': (counts['needs-you'] ?? 0) + waiting } : counts
}

function runBadges(counts: SectionCounts): GroupStatusBadge[] {
  return PROCESS_RUN_ATTENTION_SECTIONS.flatMap((section) => {
    const count = counts[section.id] ?? 0
    return count > 0
      ? [{ id: section.id, label: `${section.label} ${count}`, tone: section.tone }]
      : []
  })
}

function requestBadges(requests: readonly OpenRequest[]): GroupStatusBadge[] {
  const unaccepted = requests.filter(isUnaccepted)
  const underWay = requests.filter((request) => !isUnaccepted(request))
  const titles = (held: readonly OpenRequest[]) => held.map((request) => request.title).join('\n')
  return [
    ...(unaccepted.length > 0
      ? [
          {
            id: 'requests-to-accept',
            label: GROUP_STATUS_COPY.toAccept(unaccepted.length),
            tone: 'on_hold' as const,
            title: titles(unaccepted),
          },
        ]
      : []),
    ...(underWay.length > 0
      ? [
          {
            id: 'requests',
            label: GROUP_STATUS_COPY.requests(underWay.length),
            tone: 'queued' as const,
            title: titles(underWay),
          },
        ]
      : []),
  ]
}

function memberAttention(
  member: ProjectsGroupMemberStatus,
  counts: SectionCounts,
): GroupMemberAttention {
  if ((counts['needs-you'] ?? 0) > 0 || (counts['sign-off'] ?? 0) > 0) return 'needs-you'
  const working = Object.values(counts).some((count) => count > 0)
  return working || member.groupRuns.length > 0 || member.openRequests.length > 0
    ? 'working'
    : 'quiet'
}

function memberGit(git: ProjectsGroupMemberStatus['git']): GroupMemberGit | undefined {
  if (!git.available) return { unread: GROUP_STATUS_COPY.noCheckout }
  if (!git.branch) return undefined
  const sides = [
    ...((git.ahead ?? 0) > 0 ? [`↑${git.ahead}`] : []),
    ...((git.behind ?? 0) > 0 ? [`↓${git.behind}`] : []),
  ]
  return { branch: git.branch, ...(sides.length > 0 ? { divergence: sides.join(' ') } : {}) }
}

function memberChecks(member: ProjectsGroupMemberStatus): GroupMemberCheck[] {
  return member.failingChecks.map((check): GroupMemberCheck => {
    const id = PROJECT_CHECK_METHOD[check.kind]
    return {
      id,
      label: CHECK_METHOD_LABELS[id],
      state: 'failed',
      title: check.summary,
    }
  })
}

function memberActivity(member: ProjectsGroupMemberStatus, now: number): string | undefined {
  const at = member.lastActivity ? Date.parse(member.lastActivity.at) : Number.NaN
  return Number.isNaN(at) ? undefined : timeAgo(now, at)
}

function memberView(
  member: ProjectsGroupMemberStatus,
  runs: readonly ProcessRun[] | undefined,
  now: number,
): { view: GroupMemberView; counts: SectionCounts } {
  const rows = memberRunRows(member.projectId, runs, now)
  const counts = sectionCounts(member, rows, runs !== undefined)
  const progress = groupMemberProgress(member.storyProgress)
  const git = memberGit(member.git)
  const activity = memberActivity(member, now)
  return {
    counts,
    view: {
      projectId: member.projectId,
      attention: memberAttention(member, counts),
      badges: [...runBadges(counts), ...requestBadges(member.openRequests)],
      runs: rows,
      checks: memberChecks(member),
      ...(progress ? { progress } : {}),
      ...(git ? { git } : {}),
      ...(activity ? { activity } : {}),
    },
  }
}

function groupRunRows(status: ProjectsGroupStatus): GroupRunRow[] {
  const rows = new Map<string, GroupRunRow & { status: (typeof GROUP_RUN_STATUS_ORDER)[number] }>()
  for (const member of status.members) {
    for (const run of member.groupRuns) {
      const known = rows.get(run.id)
      if (known) {
        known.projectIds.push(member.projectId)
        continue
      }
      rows.set(run.id, {
        id: run.id,
        title: run.title,
        status: run.status,
        ...PROCESS_RUN_STATUS_VIEW[run.status],
        projectIds: [member.projectId],
      })
    }
  }
  return [...rows.values()]
    .sort(
      (a, b) => GROUP_RUN_STATUS_ORDER.indexOf(a.status) - GROUP_RUN_STATUS_ORDER.indexOf(b.status),
    )
    .map(({ status: _status, ...row }) => row)
}

/**
 * The group's home for one render: the roll-up read together with the group's
 * current root runs, which name what the roll-up only counts. The roll-up's ids
 * also hold child step runs, so a member counts the root runs it was given; with
 * `runs` not read yet it falls back on those ids. Pure.
 */
export function groupStatusView(
  status: ProjectsGroupStatus,
  runs: readonly ProcessRun[] | undefined,
  now: number,
): GroupStatusView {
  const read = status.members.map((member) => memberView(member, runs, now))
  const members = read.map(({ view }) => view)
  const totals: SectionCounts = {}
  for (const { counts } of read) {
    for (const id of SECTION_ORDER) {
      const count = counts[id] ?? 0
      if (count > 0) totals[id] = (totals[id] ?? 0) + count
    }
  }
  const failing = status.members.reduce((sum, member) => sum + member.failingChecks.length, 0)
  const requests = status.members.flatMap((member) => member.openRequests)
  return {
    headline: [
      ...runBadges(totals),
      ...(failing > 0
        ? [
            {
              id: 'checks',
              label: GROUP_STATUS_COPY.checksFailing(failing),
              tone: 'stuck' as const,
            },
          ]
        : []),
      ...requestBadges(requests),
    ],
    groupRuns: groupRunRows(status),
    members,
    sections: GROUP_MEMBER_SECTIONS.flatMap((section) => {
      const held = members.filter((member) => member.attention === section.id)
      return held.length > 0 ? [{ ...section, members: held }] : []
    }),
  }
}
