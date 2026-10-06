import { describe, expect, it } from 'vitest'

import {
  acceptanceCriteriaLine,
  acceptanceDeliveredLine,
  judgeAcceptance,
  matchAcceptanceLines,
  sumAcceptanceJudgements,
} from './acceptanceJudgement'
import type { JudgedCriterion } from './acceptanceJudgementTypes'

const asked = [
  'readFile/readPaths on a text PDF return its extracted text with page markers, not raw bytes.',
  'readFileRange(s) and grepFile(s) work on the extracted PDF text.',
  'Repeat reads of an unchanged PDF hit the cache.',
  'Non-PDF binaries return a single clear `[binary file …]` notice, and nothing throws.',
  'A scanned or encrypted PDF with no text layer returns a clear notice, not an empty string.',
  'Large PDFs are truncated with an explicit marker.',
  'Text-file behaviour is unchanged (existing tests pass).',
  'New tests use a small PDF fixture plus a binary fixture.',
]

const met = (text: string): JudgedCriterion => ({ text, status: 'met' })

const review = [
  met("readFile/readPaths return a text PDF's extracted text with page markers"),
  met('readFileRange(s) and grepFile(s) work on the extracted text'),
  met('Repeat reads of an unchanged PDF hit the cache'),
  met('Non-PDF binaries return one clear `[binary file …]` notice, and nothing throws'),
  met('A scanned or encrypted PDF returns a clear notice'),
  met('Large PDFs are truncated with an explicit marker'),
  met('Text-file behaviour is unchanged'),
  met('New tests use a small PDF fixture and a binary fixture'),
  met('Tool JSDoc updated so agents know PDFs are supported'),
]

describe('matchAcceptanceLines', () => {
  it('pairs every asked line with the review’s paraphrase of it, and leaves the reviewer’s extra out', () => {
    expect(matchAcceptanceLines(asked, review).map((l) => l.status)).toEqual(Array(8).fill('met'))
  })

  it('leaves an asked line the review never judged without a status', () => {
    const lines = matchAcceptanceLines(asked, [...review.slice(0, 6), review[8]])
    expect(lines.map((l) => l.status)).toEqual([...Array(6).fill('met'), undefined, undefined])
  })

  it('carries each judgement to its own line, whatever order the review wrote them in', () => {
    const lines = matchAcceptanceLines(asked.slice(0, 3), [
      { text: 'Repeat reads of an unchanged PDF hit the cache', status: 'not-met' },
      { text: 'readFileRange(s) and grepFile(s) work on the extracted text', status: 'partly' },
      met("readFile/readPaths return a text PDF's extracted text with page markers"),
    ])
    expect(lines.map((l) => l.status)).toEqual(['met', 'partly', 'not-met'])
  })

  it('never lets one criterion judge two lines', () => {
    const lines = matchAcceptanceLines(
      ['Fonts load on Settings', 'Fonts load on Home'],
      [met('Fonts load on Settings')],
    )
    expect(lines.map((l) => l.status)).toEqual(['met', undefined])
  })
})

describe('judgeAcceptance', () => {
  it('counts what was asked, what the review judged of it, and what it found met', () => {
    expect(judgeAcceptance(asked, review)).toEqual({ asked: 8, judged: 8, met: 8 })
    expect(judgeAcceptance(asked, [...review.slice(0, 6), review[8]])).toEqual({
      asked: 8,
      judged: 6,
      met: 6,
    })
  })

  it('judges nothing when the review listed no criteria', () => {
    expect(judgeAcceptance(asked, [])).toEqual({ asked: 8, judged: 0, met: 0 })
  })
})

describe('sumAcceptanceJudgements', () => {
  it('adds features together', () => {
    expect(
      sumAcceptanceJudgements([
        { asked: 8, judged: 7, met: 7 },
        { asked: 2, judged: 2, met: 1 },
      ]),
    ).toEqual({ asked: 10, judged: 9, met: 8 })
  })
})

describe('acceptanceDeliveredLine', () => {
  it('says the met share of what was asked when every line was judged', () => {
    expect(acceptanceDeliveredLine({ asked: 8, judged: 8, met: 8 })).toEqual({
      value: '8 of 8 met',
      sub: 'acceptance criteria, per the code review',
      whole: true,
    })
    expect(acceptanceDeliveredLine({ asked: 8, judged: 8, met: 7 }).whole).toBe(false)
  })

  it('says how many asked lines the review did not judge', () => {
    expect(acceptanceDeliveredLine({ asked: 8, judged: 7, met: 7 })).toEqual({
      value: '7 of 8 judged met',
      sub: '1 not judged · per the code review',
      whole: false,
    })
  })
})

describe('acceptanceCriteriaLine', () => {
  it('words a feature row the same way', () => {
    expect(acceptanceCriteriaLine({ asked: 8, judged: 8, met: 8 })).toBe('8 of 8 criteria met')
    expect(acceptanceCriteriaLine({ asked: 8, judged: 6, met: 6 })).toBe(
      '6 of 8 criteria judged met · 2 not judged',
    )
  })
})
