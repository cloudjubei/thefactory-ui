import {
  ACCEPTANCE_MATCH_MIN_OVERLAP,
  ACCEPTANCE_MIN_WORD_LENGTH,
  ACCEPTANCE_PER_REVIEW,
  ACCEPTANCE_STOP_WORDS,
} from './acceptanceJudgementConstants'
import type {
  AcceptanceDeliveredLine,
  AcceptanceJudgement,
  AcceptanceLineJudgement,
  JudgedCriterion,
} from './acceptanceJudgementTypes'
import { plainMarkdownLine } from './textLine'

function criterionWords(text: string): Set<string> {
  return new Set(
    plainMarkdownLine(text)
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= ACCEPTANCE_MIN_WORD_LENGTH && !ACCEPTANCE_STOP_WORDS.has(w)),
  )
}

function overlap(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  const smaller = Math.min(a.size, b.size)
  if (smaller === 0) return 0
  let shared = 0
  for (const w of a) if (b.has(w)) shared += 1
  return shared / smaller
}

/**
 * Each acceptance line that was asked, with the review's judgement of it: the
 * review's criteria are paraphrases, so each is matched to the line it shares
 * the most words with — best pairs first, each used once. A line no criterion
 * matches closely enough was not judged; a criterion matching no line (one the
 * reviewer added) judges nothing that was asked. Pure.
 */
export function matchAcceptanceLines(
  asked: readonly string[],
  criteria: readonly JudgedCriterion[],
): AcceptanceLineJudgement[] {
  const askedWords = asked.map(criterionWords)
  const judgedWords = criteria.map((c) => criterionWords(c.text))
  const pairs = askedWords
    .flatMap((a, i) => judgedWords.map((j, k) => ({ i, k, score: overlap(a, j) })))
    .filter((p) => p.score >= ACCEPTANCE_MATCH_MIN_OVERLAP)
    .sort((x, y) => y.score - x.score || x.i - y.i || x.k - y.k)
  const statusOf = new Map<number, JudgedCriterion['status']>()
  const used = new Set<number>()
  for (const { i, k } of pairs) {
    if (statusOf.has(i) || used.has(k)) continue
    statusOf.set(i, criteria[k].status)
    used.add(k)
  }
  return asked.map((text, i) => ({ text, status: statusOf.get(i) }))
}

/** How many of the asked lines the review judged, and found met. Pure. */
export function judgeAcceptance(
  asked: readonly string[],
  criteria: readonly JudgedCriterion[],
): AcceptanceJudgement {
  const lines = matchAcceptanceLines(asked, criteria)
  return {
    asked: lines.length,
    judged: lines.filter((l) => l.status !== undefined).length,
    met: lines.filter((l) => l.status === 'met').length,
  }
}

/** Several features' judgements as one. Pure. */
export function sumAcceptanceJudgements(
  judgements: readonly AcceptanceJudgement[],
): AcceptanceJudgement {
  return judgements.reduce(
    (sum, j) => ({
      asked: sum.asked + j.asked,
      judged: sum.judged + j.judged,
      met: sum.met + j.met,
    }),
    { asked: 0, judged: 0, met: 0 },
  )
}

/**
 * What was delivered of what was asked: "8 of 8 met", or — when the review
 * left some asked lines unjudged — "7 of 8 judged met" with how many it did
 * not judge, never a tally over the review's own list. Pure.
 */
export function acceptanceDeliveredLine(j: AcceptanceJudgement): AcceptanceDeliveredLine {
  const notJudged = j.asked - j.judged
  if (notJudged === 0) {
    return {
      value: `${j.met} of ${j.asked} met`,
      sub: ACCEPTANCE_PER_REVIEW,
      whole: j.met === j.asked,
    }
  }
  return {
    value: `${j.met} of ${j.asked} judged met`,
    sub: `${notJudged} not judged · per the code review`,
    whole: false,
  }
}

/** A feature row's criteria line, in the same terms as {@link acceptanceDeliveredLine}. Pure. */
export function acceptanceCriteriaLine(j: AcceptanceJudgement): string {
  const notJudged = j.asked - j.judged
  return notJudged === 0
    ? `${j.met} of ${j.asked} criteria met`
    : `${j.met} of ${j.asked} criteria judged met · ${notJudged} not judged`
}
