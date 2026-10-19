import { parseReportSections, processNeedsYouDecisions } from 'thefactory-tools/utils'
import type { ReportProofSource, ReportProofStatus, ReportSections } from 'thefactory-tools/types'

import { acceptanceDeliveredLine } from './acceptanceJudgement'
import {
  REPORT_CHECK_METHODS,
  REPORT_NOTHING_NEEDS_YOU,
  REPORT_PROOF_MARK,
  REPORT_PROOF_TAB,
  REPORT_PROOF_TONE,
  REPORT_PROOF_LINE_MAX,
  REPORT_SECTION_TITLES,
  REPORT_STEP_NAMES,
  REPORT_SUMMARY_MAX,
  REPORT_TAB_LABEL,
  REPORT_TILE_LABELS,
  REPORT_CHECKS_UNFINISHED,
} from './signoffReportConstants'
import type {
  ReportPreviewTile,
  ReportProofRow,
  ReportTile,
  SignoffProofInput,
  SignoffProofStepLine,
  SignoffReportInput,
  SignoffReportView,
} from './signoffReportTypes'
import type { ReviewTabId } from './checkMethodTypes'
import { clipLine, plainMarkdownLine } from './textLine'
import { signoffCostView, signoffTimeView } from './signoffWork'

type ReportSource = { text?: string; ref: { reportSections?: ReportSections } }

/** The report's sections as filed, else read from its markdown; absent when neither gives them. */
export function reportSectionsOf(report: ReportSource): ReportSections | undefined {
  const sections =
    report.ref.reportSections ?? (report.text ? parseReportSections(report.text) : undefined)
  return sections && { ...sections, needsYou: processNeedsYouDecisions(sections.needsYou) }
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function timeTile(input: SignoffReportInput): ReportTile {
  const view = input.work ? signoffTimeView(input.work) : undefined
  return {
    key: 'time',
    label: REPORT_TILE_LABELS.time,
    value: view?.headline ?? input.took.duration ?? '—',
    sub: view?.waiting,
    tone: 'neutral',
    ...(view ? { detail: { kind: 'time' as const, view } } : {}),
  }
}

function costTile(input: SignoffReportInput): ReportTile {
  const view = input.work ? signoffCostView(input.work) : undefined
  return {
    key: 'cost',
    label: REPORT_TILE_LABELS.cost,
    value: view?.headline ?? input.took.cost ?? '—',
    sub: view?.billing,
    tone: 'neutral',
    ...(view ? { detail: { kind: 'cost' as const, view } } : {}),
  }
}

/**
 * The four tiles — what was asked, what was delivered, the time (work, and
 * the waiting for a person apart from it) and the cost (billed, how, and its
 * list price), the last two opening their breakdowns when the runs' work is
 * known.
 */
export function reportTiles(input: SignoffReportInput): ReportTile[] {
  const asked = input.acceptance && input.acceptance.asked > 0 ? input.acceptance : undefined
  const featuresDone = {
    value: `${input.featuresDelivered.done} of ${input.featuresDelivered.total}`,
    sub: input.featuresDelivered.total === 1 ? 'feature done' : 'features done',
    whole: input.featuresDelivered.done === input.featuresDelivered.total,
  }
  const delivered = asked
    ? asked.judged > 0
      ? acceptanceDeliveredLine(asked)
      : featuresDone
    : input.criteriaMet
      ? {
          value: `${input.criteriaMet.met} of ${input.criteriaMet.total} met`,
          sub: 'acceptance criteria, per the code review',
          whole: input.criteriaMet.met === input.criteriaMet.total,
        }
      : featuresDone
  return [
    {
      key: 'asked',
      label: REPORT_TILE_LABELS.asked,
      value: plural(input.featureCount, 'feature', 'features'),
      sub:
        input.criteriaCount > 0
          ? plural(input.criteriaCount, 'acceptance criterion', 'acceptance criteria')
          : undefined,
      tone: 'neutral',
    },
    {
      key: 'delivered',
      label: REPORT_TILE_LABELS.delivered,
      value: delivered.value,
      sub: delivered.sub,
      tone: delivered.whole ? 'done' : 'working',
    },
    timeTile(input),
    costTile(input),
  ]
}

function proofRow(
  key: string,
  line: { text: string; status: ReportProofStatus; source: ReportProofSource },
  tabs: readonly ReviewTabId[],
): ReportProofRow {
  const target = REPORT_PROOF_TAB[line.source]
  const tab = target && tabs.includes(target) ? target : undefined
  return {
    key,
    text: line.text,
    status: line.status,
    mark: REPORT_PROOF_MARK[line.status],
    tone: REPORT_PROOF_TONE[line.status],
    tab,
    tabLabel: tab ? REPORT_TAB_LABEL[tab] : undefined,
  }
}

function proofRows(sections: ReportSections, tabs: readonly ReviewTabId[]) {
  return sections.howProven.map((line, i) => proofRow(`proof-${i}`, line, tabs))
}

function listed(words: readonly string[]): string {
  return words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`
}

function checksLine(input: SignoffProofInput) {
  const ran = input.checks.filter(
    (r) =>
      REPORT_CHECK_METHODS.includes(r.id) && r.state !== 'unchecked' && r.state !== 'unconfigured',
  )
  if (ran.length === 0) return undefined
  const failed = ran.filter((r) => r.state === 'failed')
  if (failed.length > 0) {
    return {
      text: `${listed(failed.map((r) => r.label))} failed — ${failed[0].detail}`,
      status: 'failed' as const,
      source: 'checks' as const,
    }
  }
  const unfinished = ran.filter((r) => r.state === 'unfinished')
  if (unfinished.length > 0) {
    return {
      text: `${listed(unfinished.map((r) => r.label))} ${REPORT_CHECKS_UNFINISHED} — ${unfinished[0].detail}`,
      status: 'unproven' as const,
      source: 'checks' as const,
    }
  }
  const flagged = ran.filter((r) => r.state === 'flagged')
  const passed = ran.filter((r) => r.state === 'passed')
  return {
    text: [
      passed.length > 0 ? `${listed(passed.map((r) => r.label))} passed` : undefined,
      flagged.length > 0 ? `${listed(flagged.map((r) => r.label))} flagged` : undefined,
    ]
      .filter(Boolean)
      .join(' · '),
    status: flagged.length > 0 ? ('unproven' as const) : ('proven' as const),
    source: 'checks' as const,
  }
}

function count(n: number): string {
  return n.toLocaleString('en-US')
}

function testsLine(input: SignoffProofInput) {
  const row = input.checks.find((r) => r.id === 'tests')
  const totals = input.testTotals
  if (row?.state === 'unfinished') {
    return {
      text: `${row.label}: ${row.detail}`,
      status: 'unproven' as const,
      source: 'tests' as const,
    }
  }
  if (totals && totals.total > 0) {
    if (totals.failed > 0) {
      return {
        text: `${count(totals.failed)} of ${count(totals.total)} tests failed`,
        status: 'failed' as const,
        source: 'tests' as const,
      }
    }
    const skipped = totals.skipped > 0 ? `, ${count(totals.skipped)} skipped` : ''
    return {
      text: `${count(totals.passed)} tests passed${skipped}`,
      status: 'proven' as const,
      source: 'tests' as const,
    }
  }
  if (!row || row.state === 'unconfigured') return undefined
  return {
    text: `${row.label}: ${row.detail}`,
    status:
      row.state === 'passed'
        ? ('proven' as const)
        : row.state === 'failed'
          ? ('failed' as const)
          : ('unproven' as const),
    source: 'tests' as const,
  }
}

function stepProof(
  name: string,
  step: SignoffProofStepLine | undefined,
  source: ReportProofSource,
) {
  if (!step) return undefined
  const said = step.line ? ` — ${firstLine(step.line)}` : ''
  return {
    text: `${name}: ${step.word}${said}`,
    status:
      step.check === 'passed'
        ? ('proven' as const)
        : step.check === 'failed'
          ? ('failed' as const)
          : ('unproven' as const),
    source,
  }
}

function firstLine(text: string): string {
  return clipLine(text.split(/\n\s*\n/)[0] ?? text, REPORT_PROOF_LINE_MAX)
}

function verifyLine(input: SignoffProofInput) {
  const sections = input.verify
  if (sections.length === 0) return undefined
  const status = sections.some((s) => s.status.tone === 'stuck')
    ? ('failed' as const)
    : sections.every((s) => s.status.tone === 'done')
      ? ('proven' as const)
      : ('unproven' as const)
  if (sections.length === 1) {
    return { text: sections[0].status.label, status, source: 'verify' as const }
  }
  const byLabel = new Map<string, number>()
  for (const s of sections) byLabel.set(s.status.label, (byLabel.get(s.status.label) ?? 0) + 1)
  return {
    text: [...byLabel].map(([label, n]) => `${label} · ${n} of ${sections.length}`).join(' · '),
    status,
    source: 'verify' as const,
  }
}

/**
 * How it was proven, from where the run stands at the end — never the report
 * agent's account of the attempts along the way: the checks at the final head,
 * the tests' count, the code review's verdict, Verify's outcome and the
 * walkthrough, one line each, each linked to the tab that holds it. Pure.
 */
export function signoffProofRows(input: SignoffProofInput): ReportProofRow[] {
  return [
    checksLine(input),
    testsLine(input),
    stepProof(REPORT_STEP_NAMES['code-review'], input.codeReview, 'code-review'),
    verifyLine(input),
    stepProof(REPORT_STEP_NAMES.walkthrough, input.walkthrough, 'walkthrough'),
  ]
    .filter((line) => line !== undefined)
    .map((line, i) => proofRow(`proof-${i}`, line, input.tabs))
}

function provenSummary(rows: readonly ReportProofRow[]): string {
  const proven = rows.filter((r) => r.status === 'proven').length
  if (proven === rows.length) return `All ${rows.length} proven`
  const gap = rows.find((r) => r.status !== 'proven')
  const head = `${proven} of ${rows.length} proven`
  return gap ? clipLine(`${head} — ${plainMarkdownLine(gap.text)}`, REPORT_SUMMARY_MAX) : head
}

function decisionsSummary(decisions: readonly string[]): string {
  if (decisions.length === 0) return 'None'
  const first = plainMarkdownLine(decisions[0])
  if (decisions.length === 1) return clipLine(first, REPORT_SUMMARY_MAX)
  return clipLine(`${decisions.length}, e.g. ${first}`, REPORT_SUMMARY_MAX)
}

function needsYouSummary(needsYou: readonly string[]): string {
  if (needsYou.length === 0) return REPORT_NOTHING_NEEDS_YOU
  return `${plural(needsYou.length, 'decision', 'decisions')} before you approve`
}

function howProvenSection(rows: readonly ReportProofRow[]) {
  return rows.length > 0
    ? {
        title: REPORT_SECTION_TITLES.howProven,
        summary: provenSummary(rows),
        body: [...rows],
        open: true,
        attention: false,
      }
    : undefined
}

/**
 * The report's fixed sections — Outcome, How it was proven (each line linked to
 * the tab that holds its proof rather than repeating it), Decisions made and
 * Needs you. A report that cannot be read as sections is kept as its markdown.
 * `proof` — the run's own final state, from {@link signoffProofRows} — replaces
 * the report's account of how it was proven when given.
 */
export function reportBodyView(
  report: ReportSource | undefined,
  tabs: readonly ReviewTabId[],
  proof?: readonly ReportProofRow[],
): Omit<SignoffReportView, 'tiles'> {
  const sections = report ? reportSectionsOf(report) : undefined
  const markdown = report?.text
  if (!sections) {
    return {
      outcome: undefined,
      howProven: proof ? howProvenSection(proof) : undefined,
      decisions: undefined,
      needsYou: undefined,
      fallbackMarkdown: markdown,
      markdown,
    }
  }
  const rows = proof ?? proofRows(sections, tabs)
  return {
    outcome: {
      title: REPORT_SECTION_TITLES.outcome,
      summary: clipLine(plainMarkdownLine(sections.outcome.headline), REPORT_SUMMARY_MAX),
      body: {
        headline: sections.outcome.headline,
        detail: sections.outcome.detail?.trim() || undefined,
      },
      open: true,
      attention: false,
    },
    howProven: howProvenSection(rows),
    decisions: {
      title: REPORT_SECTION_TITLES.decisions,
      summary: decisionsSummary(sections.decisions),
      body: sections.decisions,
      open: false,
      attention: false,
    },
    needsYou: {
      title: REPORT_SECTION_TITLES.needsYou,
      summary: needsYouSummary(sections.needsYou),
      body: sections.needsYou,
      open: sections.needsYou.length > 0,
      attention: sections.needsYou.length > 0,
    },
    fallbackMarkdown: undefined,
    markdown,
  }
}

/** The final report as an overview, not a second code review: four tiles over its fixed sections. */
export function signoffReportView(input: SignoffReportInput): SignoffReportView {
  return { tiles: reportTiles(input), ...reportBodyView(input.report, input.tabs, input.proof) }
}

/** What a report step's preview card says: the outcome, how much is proven, decisions and what needs you. */
export function reportPreviewTiles(sections: ReportSections): ReportPreviewTile[] {
  const proven = sections.howProven.filter((l) => l.status === 'proven').length
  const total = sections.howProven.length
  return [
    {
      key: 'outcome',
      label: REPORT_SECTION_TITLES.outcome,
      value: clipLine(plainMarkdownLine(sections.outcome.headline), 40),
      tone: 'neutral',
    },
    {
      key: 'proven',
      label: REPORT_TILE_LABELS.proven,
      value: total === 0 ? '—' : proven === total ? 'All' : `${proven} of ${total}`,
      tone: total > 0 && proven === total ? 'done' : 'working',
    },
    {
      key: 'decisions',
      label: REPORT_SECTION_TITLES.decisions,
      value: `${sections.decisions.length} made`,
      tone: 'neutral',
    },
    {
      key: 'needs-you',
      label: REPORT_SECTION_TITLES.needsYou,
      value:
        sections.needsYou.length === 0
          ? REPORT_NOTHING_NEEDS_YOU
          : plural(sections.needsYou.length, 'decision', 'decisions'),
      tone: sections.needsYou.length === 0 ? 'done' : 'working',
    },
  ]
}
