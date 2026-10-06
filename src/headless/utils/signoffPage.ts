import { processGroupLegMergeGate } from 'thefactory-tools/utils'
import type { ProcessGroupRun } from 'thefactory-tools/types'

import { acceptanceCriteriaLine } from './acceptanceJudgement'
import type { AcceptanceJudgement } from './acceptanceJudgementTypes'
import { CHECK_STATE_LABELS, REVIEW_TAB_LABELS } from './checkMethodConstants'
import { checkRowLayout, isAbsentCheck } from './checkMethods'
import type { CheckMethodRow, ReviewTab, ReviewTabId } from './checkMethodTypes'
import type { ProofPlanMarkRow } from './proofPlanViewTypes'
import {
  SIGNOFF_ATTENTION_ACCEPTED,
  SIGNOFF_ATTENTION_ACTION,
  SIGNOFF_ATTENTION_DRY,
  SIGNOFF_PROOF_MARK,
  SIGNOFF_PROOF_TONE,
  SIGNOFF_REQUEST_MET,
  SIGNOFF_REQUEST_NOT_MET,
  SIGNOFF_REQUEST_PAIRS,
  SIGNOFF_TAB_METHOD,
} from './signoffPageConstants'
import type {
  SignoffAttentionInput,
  SignoffAttentionItem,
  SignoffEvidenceChip,
  SignoffEvidenceTarget,
  SignoffFeatureRowView,
  SignoffMergeHold,
  SignoffProofChip,
  SignoffRequestOutcome,
} from './signoffPageTypes'
import type { ScreenPair } from './reviewEvidenceViewTypes'
import type { FixSignoff } from './storySignoffTypes'
import type { VerifyAttemptStanding } from './verifyProofTypes'
import type { RunReviewFacts } from './runReviewTypes'
import type { VerifyReviewStatus } from './processView'
import { PROCESS_GROUP_LEG_STATUS_VIEW } from './processGroupViewConstants'
import type { StoryDigest } from './storySignoffTypes'

/** A feature's acceptance text as its criteria, one per line, bullets and numbering dropped. */
export function acceptanceCriteriaLines(text: string | undefined): string[] {
  if (!text) return []
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•+]|\d+[.)])\s+/, '')
        .replace(/^\[[ xX]\]\s*/, '')
        .trim(),
    )
    .filter((line) => line.length > 0)
}

/**
 * Only what a person should act on before deciding: a section accepted over
 * its verify gate, and one verified dry. Each names its section and offers
 * what Verify said — a passed, live section needs nobody's attention.
 */
export function signoffAttentionItems(
  sections: readonly SignoffAttentionInput[],
): SignoffAttentionItem[] {
  return sections.flatMap((s): SignoffAttentionItem[] => {
    if (s.standing !== 'passed' && s.standing !== 'accepted') return []
    const texts = [
      ...(s.standing === 'accepted' ? [SIGNOFF_ATTENTION_ACCEPTED] : []),
      ...(s.mode === 'dry' ? [SIGNOFF_ATTENTION_DRY] : []),
    ]
    return texts.map((text, i) => ({
      key: `${s.id}-${i}`,
      sectionId: s.id,
      dependency: s.dependency,
      label: s.label,
      text,
      action: SIGNOFF_ATTENTION_ACTION,
    }))
  })
}

function missingTarget(row: CheckMethodRow): SignoffEvidenceTarget {
  return {
    kind: 'missing',
    title: `${row.label} — ${CHECK_STATE_LABELS[row.state]}`,
    text: row.detail,
  }
}

function targetOf(row: CheckMethodRow, tabs: ReadonlySet<ReviewTabId>): SignoffEvidenceTarget {
  if (isAbsentCheck(row)) return missingTarget(row)
  if (row.action.kind === 'open-proof' && tabs.has(row.action.tab)) {
    return { kind: 'tab', tab: row.action.tab }
  }
  if (row.id === 'diff' && tabs.has('code-review')) return { kind: 'tab', tab: 'code-review' }
  return missingTarget(row)
}

/**
 * The evidence chips ARE the evidence card's tabs: each checked method opens
 * the tab its proof is in, in tab order; what was not checked comes last and
 * opens what it says about itself. A tab no check stands for gets a chip of
 * its own, so every tab is reachable.
 */
export function signoffEvidenceChips(
  rows: readonly CheckMethodRow[],
  tabs: readonly ReviewTab[],
  tabOrder: readonly ReviewTabId[],
): SignoffEvidenceChip[] {
  const tabIds = new Set(tabs.map((t) => t.id))
  const { visible } = checkRowLayout(rows, true, tabOrder)
  const chips = visible.map(
    (row): SignoffEvidenceChip => ({ key: row.id, row, target: targetOf(row, tabIds) }),
  )
  const reached = new Set(chips.flatMap((c) => (c.target.kind === 'tab' ? [c.target.tab] : [])))
  const extra = tabOrder
    .filter((id) => tabIds.has(id) && !reached.has(id))
    .map(
      (id): SignoffEvidenceChip => ({
        key: `tab-${id}`,
        row: { id: SIGNOFF_TAB_METHOD[id], label: REVIEW_TAB_LABELS[id], state: 'passed' },
        target: { kind: 'tab', tab: id },
      }),
    )
  const opened = [...chips.filter((c) => c.target.kind === 'tab'), ...extra].sort(
    (a, b) => tabRank(a, tabOrder) - tabRank(b, tabOrder),
  )
  return [...opened, ...chips.filter((c) => c.target.kind === 'missing')]
}

function tabRank(chip: SignoffEvidenceChip, tabOrder: readonly ReviewTabId[]): number {
  return chip.target.kind === 'tab' ? tabOrder.indexOf(chip.target.tab) : tabOrder.length
}

/** Whether a chip is the one showing — chips sharing a tab are selected together. */
export function isEvidenceChipSelected(
  chip: SignoffEvidenceChip,
  selected: string | undefined,
  chips: readonly SignoffEvidenceChip[],
): boolean {
  const current =
    chips.find((c) => c.key === selected) ?? chips.find((c) => c.target.kind === 'tab')
  if (!current) return false
  if (current.key === chip.key) return true
  return (
    current.target.kind === 'tab' &&
    chip.target.kind === 'tab' &&
    current.target.tab === chip.target.tab
  )
}

/** The chip that opens a tab — what "How it was proven" links switch to. */
export function evidenceChipForTab(
  chips: readonly SignoffEvidenceChip[],
  tab: ReviewTabId,
): SignoffEvidenceChip | undefined {
  return chips.find((c) => c.target.kind === 'tab' && c.target.tab === tab)
}

/** A plan kind on a feature row: met ✓, not met ✗, unchecked ○, yours to check •. */
export function signoffProofChips(
  rows: readonly ProofPlanMarkRow[] | undefined,
): SignoffProofChip[] {
  return (rows ?? []).map((row) => ({
    key: row.kind,
    label: row.label,
    mark: SIGNOFF_PROOF_MARK[row.tone],
    tone: SIGNOFF_PROOF_TONE[row.tone],
    detail: `${row.word} — ${row.detail}`,
  }))
}

/** One row of the "What this is" card. */
export function signoffFeatureRow(input: {
  key: string
  dependency: string | undefined
  label: string
  title: string
  proofPlan: readonly ProofPlanMarkRow[] | undefined
  acceptance: string | undefined
  /** The acceptance lines against the code review's judgement of them, when it judged any. */
  judgement: AcceptanceJudgement | undefined
  /** The review's own tally — said only for a feature that lists no acceptance criteria. */
  criteriaMet: { met: number; total: number } | undefined
  status: VerifyReviewStatus
  facts: RunReviewFacts
}): SignoffFeatureRowView {
  const criteria = acceptanceCriteriaLines(input.acceptance)
  const criteriaLine =
    criteria.length > 0
      ? input.judgement && input.judgement.judged > 0
        ? acceptanceCriteriaLine(input.judgement)
        : `${criteria.length} acceptance ${criteria.length === 1 ? 'criterion' : 'criteria'}`
      : input.criteriaMet
        ? `${input.criteriaMet.met} of ${input.criteriaMet.total} criteria met`
        : undefined
  return {
    key: input.key,
    dependency: input.dependency,
    label: input.label,
    title: input.title,
    proofChips: signoffProofChips(input.proofPlan),
    criteria,
    criteriaLine,
    status: input.status,
    facts: input.facts,
  }
}

/** Features done as asked — every one that ran and did not fail. */
export function signoffFeaturesDelivered(digest: Pick<StoryDigest, 'total' | 'failed' | 'notRun'>) {
  return { done: Math.max(0, digest.total - digest.failed - digest.notRun), total: digest.total }
}

/**
 * A group leg whose dependencies are not merged yet, as its sign-off says it:
 * "Merges after thefactory-backend is merged" and each leg it waits on with
 * where it stands. Absent when it may merge now.
 */
export function signoffMergeHold(
  group: Pick<ProcessGroupRun, 'legs'>,
  legId: string,
  nameOf: (projectId: string) => string,
): SignoffMergeHold | undefined {
  const gate = processGroupLegMergeGate(group, legId)
  if (gate.canMerge) return undefined
  const names = gate.waitingOn.map((leg) => nameOf(leg.projectId))
  const listed =
    names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
  return {
    reason: `Merges after ${listed} ${names.length === 1 ? 'is' : 'are'} merged`,
    waitingOn: gate.waitingOn.map((leg, i) => ({
      key: leg.legId,
      name: names[i],
      status: PROCESS_GROUP_LEG_STATUS_VIEW[leg.status].label.toLowerCase(),
      tone: PROCESS_GROUP_LEG_STATUS_VIEW[leg.status].tone,
    })),
  }
}

function requestWords(fix: Pick<FixSignoff, 'note' | 'proofPlan'>): string | undefined {
  if (fix.note) return `“${fix.note}”`
  const kinds = (fix.proofPlan ?? []).map((r) => r.label.toLowerCase())
  return kinds.length > 0 ? `for ${kinds.join(', ')}` : undefined
}

/**
 * Whether the newest fix pass did what the person asked when they sent the
 * story back from sign-off — said where they decide, with the before/after
 * pairs its verify counted, so they need not open the nested run to find it.
 * Met only once its verify passed; not met when the fix found the request
 * unmet. Absent for a pass nobody asked for, or one still undecided. Pure.
 */
export function signoffRequestOutcome(
  fix: Pick<FixSignoff, 'sectionId' | 'label' | 'sentBy' | 'note' | 'proofPlan' | 'unmetRequest'>,
  verify: { standing: VerifyAttemptStanding; pairs: readonly ScreenPair[] } | undefined,
): SignoffRequestOutcome | undefined {
  if (fix.sentBy !== 'sign-off') return undefined
  const request = requestWords(fix)
  if (!request) return undefined
  if (fix.unmetRequest) {
    return {
      sectionId: fix.sectionId,
      label: fix.label,
      state: 'unmet',
      text: SIGNOFF_REQUEST_NOT_MET(request, fix.unmetRequest),
      pairs: [],
    }
  }
  if (verify?.standing !== 'passed') return undefined
  const pairs = verify.pairs.filter((p) => p.counted)
  return {
    sectionId: fix.sectionId,
    label: fix.label,
    state: 'met',
    text: `${SIGNOFF_REQUEST_MET(request)}${pairs.length > 0 ? ` — ${SIGNOFF_REQUEST_PAIRS(pairs.length)}` : ''}`,
    pairs,
  }
}
