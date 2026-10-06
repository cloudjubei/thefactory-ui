import { parseCodeReviewSections } from 'thefactory-tools/utils'
import type {
  CodeReviewFindingSeverity,
  CodeReviewSections,
  ReviewEvidenceRef,
  ReviewEvidenceVerdict,
} from 'thefactory-tools/types'

import type { EvidenceTile } from './reviewEvidenceViewTypes'
import {
  CODE_REVIEW_CRITERIA_TILE_LABEL,
  CODE_REVIEW_CRITERION_LABEL,
  CODE_REVIEW_CRITERION_MARK,
  CODE_REVIEW_CRITERION_TONE,
  CODE_REVIEW_DERIVED_TITLE_MAX,
  CODE_REVIEW_DERIVED_TITLE_MIN,
  CODE_REVIEW_HEADLINE_VERDICT,
  CODE_REVIEW_HEADLINE_VERDICTS,
  CODE_REVIEW_NO_CRITERIA,
  CODE_REVIEW_NO_FILE_GROUP,
  CODE_REVIEW_NO_FINDINGS,
  CODE_REVIEW_NOTHING_UNPROVEN_WORDS,
  CODE_REVIEW_SEVERITIES,
  CODE_REVIEW_SEVERITY_GROUP_TITLE,
  CODE_REVIEW_SEVERITY_PLURAL,
  CODE_REVIEW_SEVERITY_TONE,
  CODE_REVIEW_SUMMARY_MAX,
  CODE_REVIEW_VERDICT_BADGES,
} from './signoffCodeReviewConstants'
import type {
  CodeReviewFindingGroup,
  CodeReviewFindingPlace,
  CodeReviewFindingRow,
  CodeReviewFindingsGroupBy,
  CodeReviewPreview,
  CodeReviewRecordedVerdict,
  CodeReviewUnproven,
  CodeReviewVerdictBadge,
  CodeReviewView,
  CodeReviewWhere,
} from './signoffCodeReviewTypes'
import { clipLine, plainMarkdownLine } from './textLine'

type ReviewTileSource = Pick<EvidenceTile, 'text'> & {
  ref: Pick<ReviewEvidenceRef, 'verdict' | 'verdictCause'> & {
    reviewSections?: CodeReviewSections
  }
}

/** The review's sections as filed, else read from its markdown; absent when neither gives them. */
export function codeReviewSectionsOf(tile: ReviewTileSource): CodeReviewSections | undefined {
  if (tile.ref.reviewSections) return tile.ref.reviewSections
  return tile.text ? parseCodeReviewSections(tile.text) : undefined
}

/** The review's verdict as its badge says it — a proof it could not get is not a request for changes. */
export function codeReviewVerdictBadge(
  ref: Pick<ReviewEvidenceRef, 'verdict' | 'verdictCause'>,
): CodeReviewVerdictBadge {
  if (ref.verdict === 'approved') return CODE_REVIEW_VERDICT_BADGES.approved
  if (!ref.verdict) return CODE_REVIEW_VERDICT_BADGES.none
  if (ref.verdictCause === 'proof-impossible') return CODE_REVIEW_VERDICT_BADGES['proof-impossible']
  return CODE_REVIEW_VERDICT_BADGES[ref.verdict]
}

/** The verdict a review's headline says in its first words — "Approved.", "Changes requested:". */
function headlineVerdict(headline: string): ReviewEvidenceVerdict | undefined {
  const said = CODE_REVIEW_HEADLINE_VERDICT.exec(plainMarkdownLine(headline))
  return said
    ? CODE_REVIEW_HEADLINE_VERDICTS[said[1].toLowerCase().replace(/\s+/g, ' ')]
    : undefined
}

/**
 * Where a review's verdict comes from: the run's own record of it (its ledger
 * entry, which a backend restart never strips), else the filing's verdict field,
 * else — only when neither has one — what the review's headline says.
 */
export function codeReviewVerdictOf(
  tile: ReviewTileSource,
  recorded?: CodeReviewRecordedVerdict,
): Pick<ReviewEvidenceRef, 'verdict' | 'verdictCause'> {
  if (recorded) {
    return {
      verdict: recorded.verdict,
      ...(recorded.cause ? { verdictCause: recorded.cause } : {}),
    }
  }
  if (tile.ref.verdict) return tile.ref
  const sections = codeReviewSectionsOf(tile)
  const said = sections ? headlineVerdict(sections.verdict.headline) : undefined
  return said ? { verdict: said } : {}
}

/**
 * A finding's or criterion's place as the review panel draws it: a single
 * backticked span, or one bare token like a path, as code without its
 * backticks; anything else as the inline markdown it was written in.
 */
export function codeReviewWhere(where: string | undefined): CodeReviewWhere | undefined {
  const text = where?.trim()
  if (!text) return undefined
  const ticked = /^`([^`]+)`$/.exec(text)
  if (ticked) return { code: true, text: ticked[1] }
  if (/^\S+$/.test(text) && !/[`*_[\]]/.test(text)) return { code: true, text }
  return { code: false, text }
}

const FILE_WITH_LINE = /^(\S+?)(?::(\d+(?:[-–]\d+)?))?$/
const PLACE_PARTS = /\s+[·›>]\s+/

function looksLikeFile(token: string): boolean {
  return /[/]/.test(token) || /\.[A-Za-z][\w]*$/.test(token)
}

/**
 * Where a finding is, split for its card: `"FileTools.ts · searchFilesFs"` is
 * a file and a symbol, `"src/a.ts:12"` a file and its line, a lone backticked
 * identifier a symbol, and anything else the reviewer's own words.
 */
export function codeReviewFindingPlace(where: string | undefined): CodeReviewFindingPlace {
  const place: CodeReviewFindingPlace = {
    file: undefined,
    line: undefined,
    symbol: undefined,
    prose: undefined,
  }
  const text = where?.trim().replace(/^`([^`]+)`$/, '$1')
  if (!text) return place
  const [head, ...rest] = text.split(PLACE_PARTS)
  const symbol = rest.join(' › ').replace(/`/g, '').trim() || undefined
  const file = FILE_WITH_LINE.exec(head)
  if (file && (looksLikeFile(file[1]) || file[2] !== undefined)) {
    return { ...place, file: file[1], line: file[2], symbol }
  }
  if (rest.length === 0 && /^[\w$.#:<>()-]+$/.test(head) && codeReviewWhere(where)?.code) {
    return { ...place, symbol: head }
  }
  return { ...place, prose: text }
}

const CLAUSE_END = /[.;:!?](?=\s|$)|\s[—–]\s/g

/**
 * A finding's title and the explanation under it: the reviewer's own title
 * over the whole explanation, else — for a review filed before titles — its
 * first clause, with the rest of it beneath. A first clause too long for a
 * title is clipped, and the whole explanation stays beneath it.
 */
export function codeReviewFindingTitle(finding: { title?: string; text: string }): {
  title: string
  text: string
} {
  const own = finding.title?.trim()
  const text = finding.text.trim()
  if (own) return { title: own, text }
  for (const end of text.matchAll(CLAUSE_END)) {
    const clause = text.slice(0, end.index).trim()
    if (plainMarkdownLine(clause).length < CODE_REVIEW_DERIVED_TITLE_MIN) continue
    if (plainMarkdownLine(clause).length > CODE_REVIEW_DERIVED_TITLE_MAX) break
    return { title: clause, text: text.slice(end.index + end[0].length).trim() }
  }
  if (plainMarkdownLine(text).length <= CODE_REVIEW_DERIVED_TITLE_MAX)
    return { title: text, text: '' }
  return { title: clipLine(plainMarkdownLine(text), CODE_REVIEW_DERIVED_TITLE_MAX), text }
}

function findingsCount(n: number): string {
  return `${n} ${n === 1 ? 'finding' : 'findings'}`
}

/**
 * The findings in groups: by severity, worst first, the nits folded unless
 * they are all there is or were asked for; or by file, in the order the worst
 * finding names each, the findings that name none last. A severity `filter`
 * keeps only its findings.
 */
export function codeReviewFindingGroups(
  findings: readonly CodeReviewFindingRow[],
  by: CodeReviewFindingsGroupBy,
  filter: CodeReviewFindingSeverity | undefined,
): CodeReviewFindingGroup[] {
  const rows = filter ? findings.filter((f) => f.severity === filter) : findings
  if (by === 'severity') {
    const present = CODE_REVIEW_SEVERITIES.filter((s) => rows.some((f) => f.severity === s))
    return present.map((severity) => {
      const of = rows.filter((f) => f.severity === severity)
      return {
        key: severity,
        kind: 'severity',
        title: CODE_REVIEW_SEVERITY_GROUP_TITLE[severity],
        tone: CODE_REVIEW_SEVERITY_TONE[severity],
        count: findingsCount(of.length),
        defaultOpen: severity !== 'nit' || present.length === 1,
        rows: of,
      }
    })
  }
  const byFile = new Map<string, CodeReviewFindingRow[]>()
  for (const f of rows) {
    const key = f.place.file ?? ''
    byFile.set(key, [...(byFile.get(key) ?? []), f])
  }
  const files = [...byFile.keys()].sort((a, b) => Number(a === '') - Number(b === ''))
  return files.map((file) => ({
    key: file || CODE_REVIEW_NO_FILE_GROUP,
    kind: 'file',
    title: file || CODE_REVIEW_NO_FILE_GROUP,
    tone: 'neutral',
    count: findingsCount(byFile.get(file)!.length),
    defaultOpen: true,
    rows: byFile.get(file)!,
  }))
}

function evidenceItems(text: string): string[] {
  return text
    .split(/\n/)
    .map((line) => line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '').trim())
    .filter((line) => line.length > 0)
}

function unprovenOf(unproven: string, filed: boolean): CodeReviewUnproven {
  const items = evidenceItems(unproven)
  if (items.length === 1 && CODE_REVIEW_NOTHING_UNPROVEN_WORDS.test(items[0])) {
    return { state: 'none' }
  }
  if (items.length > 0) return { state: 'listed', items }
  return filed ? { state: 'none' } : { state: 'unstated' }
}

function countOf(severity: CodeReviewFindingSeverity, n: number): string {
  const [one, many] = CODE_REVIEW_SEVERITY_PLURAL[severity]
  return `${n} ${n === 1 ? one : many}`
}

function severityCounts(sections: CodeReviewSections): Record<CodeReviewFindingSeverity, number> {
  const counts: Record<CodeReviewFindingSeverity, number> = {
    blocker: 0,
    major: 0,
    minor: 0,
    nit: 0,
  }
  for (const f of sections.findings) counts[f.severity] += 1
  return counts
}

/** "3 minor · 3 nits" — only the severities that have findings; "None" when nothing was found. */
export function codeReviewFindingsSummary(sections: CodeReviewSections): string {
  const counts = severityCounts(sections)
  const parts = CODE_REVIEW_SEVERITIES.filter((s) => counts[s] > 0).map((s) =>
    countOf(s, counts[s]),
  )
  return parts.length > 0 ? parts.join(' · ') : CODE_REVIEW_NO_FINDINGS
}

function criteriaMet(sections: CodeReviewSections): { met: number; total: number } | undefined {
  if (sections.criteria.length === 0) return undefined
  return {
    met: sections.criteria.filter((c) => c.status === 'met').length,
    total: sections.criteria.length,
  }
}

function evidenceSummary(sections: CodeReviewSections): string {
  const shows = sections.evidence.shows.trim()
  const unproven = sections.evidence.unproven.trim()
  const half = Math.floor(CODE_REVIEW_SUMMARY_MAX / 2)
  if (shows && unproven) {
    return `${clipLine(plainMarkdownLine(shows), half)} · ${clipLine(plainMarkdownLine(unproven), half)}`
  }
  return clipLine(plainMarkdownLine(shows || unproven), CODE_REVIEW_SUMMARY_MAX)
}

/**
 * A filed code review in its four fixed sections — Verdict, Findings,
 * Acceptance criteria, Evidence — from the sections the reviewer filed, else
 * from its markdown read the same way. Absent when neither gives them: the
 * review is then shown as the markdown it is. `recorded` is the verdict the
 * run's ledger kept for it, which decides the badge when given.
 */
export function codeReviewView(
  tile: ReviewTileSource,
  recorded?: CodeReviewRecordedVerdict,
): CodeReviewView | undefined {
  const sections = codeReviewSectionsOf(tile)
  if (!sections) return undefined
  const counts = severityCounts(sections)
  const met = criteriaMet(sections)
  const findings: CodeReviewFindingRow[] = CODE_REVIEW_SEVERITIES.flatMap((severity) =>
    sections.findings
      .filter((f) => f.severity === severity)
      .map((f, i) => ({
        key: `${severity}-${i}`,
        severity,
        place: codeReviewFindingPlace(f.where),
        ...codeReviewFindingTitle(f),
        tone: CODE_REVIEW_SEVERITY_TONE[severity],
      })),
  )
  return {
    verdict: codeReviewVerdictBadge(codeReviewVerdictOf(tile, recorded)),
    headline: sections.verdict.headline,
    detail: sections.verdict.detail?.trim() || undefined,
    worthALook: sections.verdict.worthALook?.trim() || undefined,
    tiles: [
      ...CODE_REVIEW_SEVERITIES.map((severity) => ({
        key: severity,
        label: severity,
        count: String(counts[severity]),
        tone: counts[severity] > 0 ? CODE_REVIEW_SEVERITY_TONE[severity] : ('neutral' as const),
      })),
      ...(met
        ? [
            {
              key: 'criteria' as const,
              label: CODE_REVIEW_CRITERIA_TILE_LABEL,
              count: `${met.met}/${met.total}`,
              tone: met.met === met.total ? ('done' as const) : ('working' as const),
            },
          ]
        : []),
    ],
    findings,
    findingsSummary: codeReviewFindingsSummary(sections),
    criteria: sections.criteria.map((c, i) => ({
      key: `criterion-${i}`,
      text: c.text,
      status: c.status,
      mark: CODE_REVIEW_CRITERION_MARK[c.status],
      statusLabel: CODE_REVIEW_CRITERION_LABEL[c.status],
      tone: CODE_REVIEW_CRITERION_TONE[c.status],
      where: codeReviewWhere(c.where),
    })),
    criteriaSummary: met ? `${met.met} of ${met.total} met` : CODE_REVIEW_NO_CRITERIA,
    criteriaMet: met,
    shows: sections.evidence.shows,
    showsItems: evidenceItems(sections.evidence.shows),
    unproven: unprovenOf(sections.evidence.unproven, tile.ref.reviewSections !== undefined),
    evidenceSummary: evidenceSummary(sections),
    markdown: tile.text,
  }
}

/** What a step's preview card says of its review: the badge, one line, and the counts. */
export function codeReviewPreview(view: CodeReviewView): CodeReviewPreview {
  const counts: Record<CodeReviewFindingSeverity, number> = {
    blocker: 0,
    major: 0,
    minor: 0,
    nit: 0,
  }
  for (const f of view.findings) counts[f.severity] += 1
  const line = view.worthALook ? `${view.headline} Worth a look: ${view.worthALook}` : view.headline
  return {
    verdict: view.verdict,
    line: clipLine(plainMarkdownLine(line), CODE_REVIEW_SUMMARY_MAX),
    chips: [
      ...CODE_REVIEW_SEVERITIES.filter((s) => counts[s] > 0).map((s) => ({
        key: s,
        label: countOf(s, counts[s]),
        tone: CODE_REVIEW_SEVERITY_TONE[s],
      })),
      ...(view.criteriaMet
        ? [
            {
              key: 'criteria',
              label: `${view.criteriaMet.met}/${view.criteriaMet.total} criteria`,
              tone:
                view.criteriaMet.met === view.criteriaMet.total
                  ? ('done' as const)
                  : ('working' as const),
            },
          ]
        : []),
    ],
  }
}
