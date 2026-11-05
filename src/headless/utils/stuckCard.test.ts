import { describe, expect, it } from 'vitest'
import type { ProcessLedgerEntry, StuckSignal } from 'thefactory-tools/types'
import { stuckAnswerOf, stuckAskPayload } from 'thefactory-tools/utils'

import { parseQuestionPayload } from './agentQuestions'
import {
  canSendStuckHint,
  processParkStuckView,
  processStepStuckView,
  stuckCardView,
  stuckEvidenceLines,
} from './stuckCard'
import { QUESTION_CARD_TITLE } from './agentQuestionConstants'
import { STUCK_RUN_LABEL } from './stuckCardConstants'

const failing: StuckSignal = {
  kind: 'repeated-error',
  toolName: 'runTests',
  count: 3,
  action: 'runTests({"path":"src"})',
  error: 'Cannot find module',
  reason: 'runTests failed 3 times in a row the same way: Cannot find module',
  key: 'k1',
}
const repeating: StuckSignal = {
  kind: 'repeated-call',
  toolName: 'readFile',
  count: 5,
  action: 'readFile({"path":"a.ts"})',
  reason: 'it made the same call 5 times and got the same result (readFile)',
  key: 'k2',
}

describe('parseQuestionPayload — a stuck question', () => {
  it('keeps the evidence beside the question', () => {
    const parsed = parseQuestionPayload(stuckAskPayload(failing))
    expect(parsed.stuck).toEqual(failing)
    expect(parsed.question).toContain('The agent seems stuck')
  })

  it('leaves it off any other question', () => {
    expect(parseQuestionPayload({ question: 'Which branch?' }).stuck).toBeUndefined()
  })

  it('leaves off a stuck field that is not the evidence', () => {
    expect(parseQuestionPayload({ question: 'x', stuck: { kind: 'y' } }).stuck).toBeUndefined()
  })
})

describe('stuckEvidenceLines', () => {
  it('says how often, the call, and the error when it failed', () => {
    expect(stuckEvidenceLines(failing)).toEqual([
      'runTests, 3 times in a row',
      failing.action,
      'Cannot find module',
    ])
  })

  it('has no error line for calls that succeeded', () => {
    expect(stuckEvidenceLines(repeating)).toEqual(['readFile, 5 times in a row', repeating.action])
  })
})

describe('stuckCardView', () => {
  it('is nothing for a question that is not stuck', () => {
    expect(stuckCardView({ question: 'Which branch?' })).toBeUndefined()
  })

  it('offers the three answers the host reads, each saying what it does', () => {
    const view = stuckCardView(parseQuestionPayload(stuckAskPayload(failing)))
    expect(view?.title).toBe(QUESTION_CARD_TITLE)
    expect(view?.evidence).toEqual(stuckEvidenceLines(failing))
    expect(view?.answers.map((a) => a.kind)).toEqual(['continue', 'hint', 'stop'])
    for (const answer of view?.answers ?? []) expect(answer.detail.length).toBeGreaterThan(0)
  })

  it('sends words the host reads back as the same choice', () => {
    const view = stuckCardView(parseQuestionPayload(stuckAskPayload(failing)))
    const label = (kind: string) => view?.answers.find((a) => a.kind === kind)?.label
    expect(stuckAnswerOf({ answer: label('continue') }).choice).toBe('continue')
    expect(stuckAnswerOf({ answer: label('stop') }).choice).toBe('stop')
  })
})

describe('canSendStuckHint', () => {
  it('takes a hint in the person’s own words', () => {
    expect(canSendStuckHint('Try the other config')).toBe(true)
  })

  it('takes nothing empty', () => {
    expect(canSendStuckHint('   ')).toBe(false)
  })

  it.each(['stop', ' Stop ', 'STOP', 'continue', 'Give it a hint'])(
    'refuses %j: the host would read it as that choice, and Stop must be confirmed',
    (text) => {
      expect(canSendStuckHint(text)).toBe(false)
    },
  )

  it('agrees with the host about every word it lets through', () => {
    for (const text of ['stop now', 'continue with b', 'hint']) {
      expect(canSendStuckHint(text)).toBe(true)
      expect(stuckAnswerOf({ answer: text }).choice).toBe('hint')
    }
  })
})

const entry = (over: Partial<ProcessLedgerEntry>): ProcessLedgerEntry =>
  ({ id: 'e1', stepId: 'implement', ...over }) as ProcessLedgerEntry

describe('processStepStuckView', () => {
  it('shows the evidence of an attempt the host stopped', () => {
    expect(processStepStuckView(entry({ agentStop: 'stuck', stuck: repeating }))).toEqual({
      label: STUCK_RUN_LABEL,
      headline: 'readFile, 5 times in a row',
      evidence: [repeating.action],
    })
  })

  it('is nothing for an attempt stopped another way', () => {
    expect(processStepStuckView(entry({ agentStop: 'turn-limit' }))).toBeUndefined()
    expect(processStepStuckView(undefined)).toBeUndefined()
  })

  it('is nothing for evidence left on an attempt that stopped another way', () => {
    expect(
      processStepStuckView(entry({ agentStop: 'turn-limit', stuck: repeating })),
    ).toBeUndefined()
  })

  it('is nothing for a stop that carries no evidence', () => {
    expect(processStepStuckView(entry({ agentStop: 'stuck' }))).toBeUndefined()
  })
})

describe('processParkStuckView', () => {
  const stopped = entry({ id: 'e2', agentStop: 'stuck', stuck: failing })
  const park = { stepId: 'implement' } as never

  it('reads the newest attempt of the step the run is stopped at', () => {
    const view = processParkStuckView({
      park,
      ledger: [entry({ agentStop: 'stuck', stuck: repeating }), stopped],
    })
    expect(view?.headline).toBe('runTests, 3 times in a row')
    expect(view?.evidence).toEqual([failing.action, failing.error])
  })

  it('is nothing when a later attempt of that step was not stuck', () => {
    expect(processParkStuckView({ park, ledger: [stopped, entry({ id: 'e3' })] })).toBeUndefined()
  })

  it('leaves out another step’s attempt', () => {
    expect(
      processParkStuckView({ park, ledger: [{ ...stopped, stepId: 'verify' }] }),
    ).toBeUndefined()
  })

  it('is nothing with no park', () => {
    expect(processParkStuckView({ ledger: [stopped] })).toBeUndefined()
  })
})
