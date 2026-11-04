import type { ProcessParkChoice } from 'thefactory-tools/types'

import {
  GROUP_SIGN_OFF_ATTACHMENT_KINDS,
  GROUP_SIGN_OFF_CHOICE_TEXT,
  GROUP_SIGN_OFF_PR_BADGE,
  GROUP_SIGN_OFF_PR_TEXT,
  GROUP_SIGN_OFF_TEXT,
  SIGN_OFF_OUTPUT_MAX_CHARS,
  SIGN_OFF_OUTPUT_TEXT,
} from './groupSignOffConstants'
import type {
  GroupSignOffAttachment,
  GroupSignOffAttachmentRow,
  GroupSignOffData,
  GroupSignOffPhase,
  GroupSignOffPullRequestState,
  GroupSignOffRepo,
  GroupSignOffRepoRow,
  GroupSignOffScreen,
  GroupSignOffState,
  SignOffOutputChipView,
  SignOffOutputDocument,
  SignOffOutputDraft,
  SignOffOutputDraftView,
  SignOffOutputSectionView,
  SignOffTextSegment,
} from './groupSignOffTypes'
import { ticketChipView, ticketLink } from './groupTickets'
import { processParkAnswersView } from './processParkAnswers'
import type { ParkAnswersView } from './processParkAnswersTypes'
import { fileNameSlug } from './reviewEvidenceView'

type NameOf = (projectId: string) => string

const SUBMITTED_STATES: readonly GroupSignOffPullRequestState[] = [
  'opening',
  'opened',
  'failed',
  'by-hand',
  'merged',
]
const ASKED_OF_A_PERSON: readonly GroupSignOffPullRequestState[] = ['opened', 'by-hand', 'failed']
const PLACEHOLDER = /\{\{[^{}\n]*\}\}/g
const EXTENSION = /\.[a-z0-9]{1,5}$/i
const SECTION_KEY_GAP = '\u0000'

/** The key an edit and its errors are kept under: stable while the document's version changes. */
export const signOffSectionKey = (label: string, projectId: string): string =>
  `${label}${SECTION_KEY_GAP}${projectId}`

/** Where a group run's one sign-off stands. Pure. */
export function groupSignOffPhase(data: GroupSignOffData): GroupSignOffPhase {
  if (data.canDecide) return 'deciding'
  if (data.repos.some((r) => SUBMITTED_STATES.includes(r.pullRequest.state))) return 'submitted'
  const stopped = data.status === 'cancelled' || data.status === 'failed'
  if (stopped || data.repos.some((r) => r.status === 'rejected')) return 'ended'
  return data.canEditOutputs ? 'building' : 'submitted'
}

function pullRequestLink(repo: GroupSignOffRepo): GroupSignOffRepoRow['link'] {
  const { state, url, compareUrl } = repo.pullRequest
  const safe = ticketLink(state === 'by-hand' ? compareUrl : url)
  if (!safe) return undefined
  const label =
    state === 'by-hand' ? GROUP_SIGN_OFF_PR_TEXT.byHandLink : GROUP_SIGN_OFF_PR_TEXT.openPullRequest
  return { label, url: safe }
}

function pullRequestLine(repo: GroupSignOffRepo): string | undefined {
  const { state, leftOut } = repo.pullRequest
  if (state === 'left-out') return leftOut
  if (state === 'waiting') return GROUP_SIGN_OFF_PR_TEXT.waiting
  if (state === 'unread') return GROUP_SIGN_OFF_PR_TEXT.unread
  if (state === 'by-hand') return GROUP_SIGN_OFF_PR_TEXT.byHandLine
  if (state === 'merged') return GROUP_SIGN_OFF_PR_TEXT.mergedLine
  return undefined
}

function repoRow(repo: GroupSignOffRepo, nameOf: NameOf): GroupSignOffRepoRow {
  const { legId, projectId, title, runId, branch, baseRef, pullRequest } = repo
  const { state, files, generated, error } = pullRequest
  const line = pullRequestLine(repo)
  const link = pullRequestLink(repo)
  return {
    legId,
    projectId,
    name: nameOf(projectId),
    storyTitle: title,
    ...(runId ? { runId } : {}),
    ...(branch && baseRef ? { branchLine: `${branch} → ${baseRef}` } : {}),
    badge: GROUP_SIGN_OFF_PR_BADGE[state],
    ...(line ? { line } : {}),
    ...(pullRequest.title ? { prTitle: pullRequest.title } : {}),
    ...(files && state === 'to-open'
      ? { filesLine: GROUP_SIGN_OFF_PR_TEXT.files(files.length, generated?.length ?? 0) }
      : {}),
    ...(link ? { link } : {}),
    ...(error ? { error } : {}),
    busy: state === 'opening',
  }
}

function attachmentRow(
  attachment: GroupSignOffAttachment,
  state: GroupSignOffState,
  nameOf: NameOf,
): GroupSignOffAttachmentRow {
  const fetch = state.fetches[attachment.evidenceId]
  const url = ticketLink(attachment.url)
  return {
    key: attachment.evidenceId,
    name: attachment.name,
    projectName: nameOf(attachment.projectId),
    kindLabel: GROUP_SIGN_OFF_ATTACHMENT_KINDS[attachment.kind],
    ...(url ? { link: { label: GROUP_SIGN_OFF_TEXT.openLink, url } } : {}),
    attachment,
    busy: fetch?.busy === true,
    ...(fetch?.error ? { error: fetch.error } : {}),
  }
}

function decisionChoices(toOpen: number): ProcessParkChoice[] {
  const text = GROUP_SIGN_OFF_CHOICE_TEXT
  return [
    { choice: 'approve', label: text.approve, detail: text.approveDoes(toOpen), primary: true },
    { choice: 'request-changes', label: text.requestChanges, detail: text.requestChangesDoes },
    { choice: 'reject', label: text.reject, detail: text.rejectDoes },
  ]
}

function submittedBadge(repos: readonly GroupSignOffRepo[]): GroupSignOffScreen['badge'] {
  const states = repos.map((r) => r.pullRequest.state)
  if (states.includes('failed')) {
    return { label: GROUP_SIGN_OFF_TEXT.failedBadge, tone: 'stuck' }
  }
  if (states.includes('opening')) {
    return { label: GROUP_SIGN_OFF_TEXT.submittingBadge, tone: 'working' }
  }
  return { label: GROUP_SIGN_OFF_TEXT.submittedBadge, tone: 'done' }
}

function submittedLine(repos: readonly GroupSignOffRepo[]): string {
  const states = repos.map((r) => r.pullRequest.state)
  const opened = states.filter((s) => s === 'opened').length
  const total = states.filter((s) => s === 'opening' || ASKED_OF_A_PERSON.includes(s)).length
  return GROUP_SIGN_OFF_TEXT.submittedLine(opened, total)
}

function headOf(
  phase: GroupSignOffPhase,
  repos: readonly GroupSignOffRepo[],
): Pick<GroupSignOffScreen, 'badge' | 'line'> {
  switch (phase) {
    case 'deciding':
      return {
        badge: { label: GROUP_SIGN_OFF_TEXT.badge, tone: 'review' },
        line: GROUP_SIGN_OFF_TEXT.decidingLine,
      }
    case 'submitted':
      return { badge: submittedBadge(repos), line: submittedLine(repos) }
    case 'ended':
      return {
        badge: { label: GROUP_SIGN_OFF_TEXT.ended, tone: 'empty' },
        line: GROUP_SIGN_OFF_TEXT.endedLine,
      }
    case 'building':
      return {
        badge: { label: GROUP_SIGN_OFF_TEXT.building, tone: 'running' },
        line: GROUP_SIGN_OFF_TEXT.buildingLine(
          repos.filter((r) => r.status === 'at-sign-off').length,
          repos.length,
        ),
      }
  }
}

const outputSections = (data: GroupSignOffData) =>
  data.outputs.flatMap((output) =>
    output.sections.map((section) => ({
      output,
      section,
      key: signOffSectionKey(output.label, section.projectId),
    })),
  )

/** The whole sign-off as its screens show it. `nameOf` gives a project's name. Pure. */
export function groupSignOffScreen(
  data: GroupSignOffData,
  state: GroupSignOffState,
  nameOf: NameOf,
): GroupSignOffScreen {
  const phase = groupSignOffPhase(data)
  const deciding = phase === 'deciding'
  const repos = data.repos.map((repo) => repoRow(repo, nameOf))
  const toOpen = data.repos.filter((r) => r.pullRequest.state === 'to-open').length
  const unsaved = outputSections(data).flatMap(({ output, key }) =>
    state.drafts[key] ? [output.label] : [],
  )
  return {
    phase,
    ...headOf(phase, data.repos),
    title: data.title,
    tickets: data.tickets.map((ref) =>
      ticketChipView({ key: ref.externalId, title: ref.title, url: ref.url }),
    ),
    repos,
    ...(deciding ? { plan: GROUP_SIGN_OFF_TEXT.plan(toOpen) } : {}),
    ...(data.goingLive.words ? { goingLive: data.goingLive.words } : {}),
    choices: deciding ? decisionChoices(toOpen) : [],
    sendBack: repos.filter(
      (row) => data.repos.find((r) => r.legId === row.legId)?.status === 'at-sign-off',
    ),
    canRetry: data.canRetry,
    attachments: data.attachments.map((a) => attachmentRow(a, state, nameOf)),
    loomLeft: data.walkthrough.filter((item) => !item.result).length,
    unsaved: [...new Set(unsaved)],
  }
}

/** The decision's answers: the run sign-off's, with Reject asking about every repo. Pure. */
export function groupSignOffAnswers(
  choices: readonly ProcessParkChoice[],
  selectedKey?: string,
): ParkAnswersView {
  const view = processParkAnswersView(choices, undefined, selectedKey)
  const { rejectConfirm, rejectConfirmLabel } = GROUP_SIGN_OFF_CHOICE_TEXT
  const confirmed = <T extends { choice: string }>(answer: T) =>
    answer.choice === 'reject'
      ? { ...answer, confirm: { text: rejectConfirm, label: rejectConfirmLabel } }
      : answer
  return {
    ...view,
    ...(view.lead ? { lead: confirmed(view.lead) } : {}),
    others: view.others.map(confirmed),
    minor: view.minor.map(confirmed),
  }
}

/** An output's text split so each `{{...}}` left unfilled can stand out. Pure. */
export function signOffOutputSegments(text: string): SignOffTextSegment[] {
  const segments: SignOffTextSegment[] = []
  let at = 0
  for (const match of text.matchAll(PLACEHOLDER)) {
    if (match.index > at) segments.push({ text: text.slice(at, match.index), unfilled: false })
    segments.push({ text: match[0], unfilled: true })
    at = match.index + match[0].length
  }
  if (at < text.length) segments.push({ text: text.slice(at), unfilled: false })
  return segments
}

/** Each placeholder an output's text still holds, once. Pure. */
export function signOffOutputUnfilled(text: string): string[] {
  return [...new Set(text.match(PLACEHOLDER) ?? [])]
}

/** What stops an output's text being saved. Pure. */
export function signOffOutputProblem(text: string): string | undefined {
  if (text.trim() === '') return SIGN_OFF_OUTPUT_TEXT.empty
  if (text.length > SIGN_OFF_OUTPUT_MAX_CHARS) {
    return SIGN_OFF_OUTPUT_TEXT.tooLong(SIGN_OFF_OUTPUT_MAX_CHARS)
  }
  return undefined
}

/** What an attachment is saved as: its own name, or its label as a file name with its type's extension. Pure. */
export function signOffAttachmentFileName(
  attachment: Pick<GroupSignOffAttachment, 'name' | 'mediaType'>,
): string {
  const { name, mediaType } = attachment
  if (EXTENSION.test(name)) return name
  const stem = fileNameSlug(name, 'attachment')
  const extension = mediaType?.split('/')[1]?.split('+')[0]
  return extension ? `${stem}.${extension}` : stem
}

function draftView(draft: SignOffOutputDraft, saving: boolean): SignOffOutputDraftView {
  const { text, notice, error } = draft
  const problem = signOffOutputProblem(text)
  return {
    text,
    saving,
    ...(notice
      ? {
          notice: {
            kind: notice,
            text:
              notice === 'closed'
                ? SIGN_OFF_OUTPUT_TEXT.closedNotice
                : SIGN_OFF_OUTPUT_TEXT.changedNotice,
          },
        }
      : {}),
    ...(error ? { error } : {}),
    ...(problem ? { problem } : {}),
  }
}

function sectionView(
  data: GroupSignOffData,
  state: GroupSignOffState,
  nameOf: NameOf,
  label: string,
  perRepo: boolean,
  section: GroupSignOffData['outputs'][number]['sections'][number],
): SignOffOutputSectionView {
  const key = signOffSectionKey(label, section.projectId)
  const { evidenceId, projectId } = section
  const filed = evidenceId ? state.documents[evidenceId] : undefined
  const error = state.documentErrors[key]
  const draft = state.drafts[key]
  const text = filed?.text
  return {
    key,
    projectId,
    ...(perRepo ? { heading: nameOf(projectId) } : {}),
    written: evidenceId !== undefined,
    loading: evidenceId !== undefined && !filed && !error,
    ...(text !== undefined ? { text } : {}),
    segments: signOffOutputSegments(text ?? ''),
    unfilled: signOffOutputUnfilled(text ?? ''),
    editable: data.canEditOutputs && filed?.editable === true,
    ...(draft ? { draft: draftView(draft, state.saving.includes(key)) } : {}),
    ...(error ? { error } : {}),
  }
}

/** Each output as its chip and what opens behind it. Pure. */
export function signOffOutputChips(
  data: GroupSignOffData,
  state: GroupSignOffState,
  nameOf: NameOf,
): SignOffOutputChipView[] {
  return data.outputs.map((output) => {
    const { label, perRepo } = output
    const sections = output.sections.map((s) => sectionView(data, state, nameOf, label, perRepo, s))
    const toWrite = sections.filter((s) => !s.written).length
    const toFill = sections.reduce((sum, s) => sum + s.unfilled.length, 0)
    const left =
      toWrite > 0
        ? SIGN_OFF_OUTPUT_TEXT.toWrite(toWrite)
        : toFill > 0
          ? SIGN_OFF_OUTPUT_TEXT.toFill(toFill)
          : undefined
    return {
      key: `output-${label}`,
      row: {
        id: 'report',
        label: left ? `${label} · ${left}` : label,
        state: left ? 'unchecked' : 'passed',
        ...(left ? { available: { commands: [] } } : {}),
      },
      panel: { label, perRepo, sections },
    }
  })
}

/**
 * Every edit against a fresh read of the sign-off. Text is never dropped unless
 * it says what the version it started from said: an edit whose document moved on
 * or whose sign-off was decided stays, with what the person must be told. Pure.
 */
export function settleSignOffDrafts(
  drafts: Readonly<Record<string, SignOffOutputDraft>>,
  data: GroupSignOffData,
  documents: Readonly<Record<string, SignOffOutputDocument>>,
): Record<string, SignOffOutputDraft> {
  const current = new Map(outputSections(data).map(({ key, section }) => [key, section.evidenceId]))
  const settled: Record<string, SignOffOutputDraft> = {}
  for (const [key, draft] of Object.entries(drafts)) {
    const moved = current.get(key) !== draft.baseEvidenceId
    if (!moved && data.canEditOutputs) {
      const { notice: _gone, ...standing } = draft
      settled[key] = standing
      continue
    }
    if (draft.text === documents[draft.baseEvidenceId]?.text) continue
    settled[key] = { ...draft, notice: data.canEditOutputs ? 'changed' : 'closed' }
  }
  return settled
}
