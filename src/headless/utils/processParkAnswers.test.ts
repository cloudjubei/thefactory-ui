import { describe, expect, it } from 'vitest'
import type { ProcessParkChoice } from 'thefactory-tools/types'

import { PARK_ANSWER_NOTE_LABEL } from './processParkAnswersConstants'
import {
  parkAnswerIsMinor,
  parkOwnAnswerChoice,
  processParkAnswersView,
} from './processParkAnswers'

const choice = (c: ProcessParkChoice['choice'], extra: Partial<ProcessParkChoice> = {}) => ({
  choice: c,
  label: `${c} label`,
  detail: `${c} detail`,
  ...extra,
})

const turnLimit: ProcessParkChoice[] = [
  choice('update-base', { label: 'Bring in main (2 new commits) and re-check' }),
  choice('retry', { label: 'Raise the limit and try again', primary: true }),
  choice('continue'),
  choice('abandon'),
]

describe('processParkAnswersView', () => {
  it('tells a turn-limit raise apart from trying again on the same limit', () => {
    const raise = {
      current: { limitTurns: true, maxTurns: 50 },
      suggested: 100,
    }
    const view = processParkAnswersView([
      choice('retry', { label: 'Try again from where it stopped', primary: true }),
      choice('retry', { label: 'Raise the limit and try again', turnLimit: raise }),
      choice('abandon'),
    ])
    expect(view.lead).toMatchObject({ key: 'retry', label: 'Try again from where it stopped' })
    expect(view.others.map((a) => [a.key, a.label])).toEqual([
      ['retry:raise', 'Raise the limit and try again'],
    ])
  })

  it('puts a manager’s retry on trying again, not on the raise', () => {
    const raise = { current: { limitTurns: true, maxTurns: 50 }, suggested: 100 }
    const view = processParkAnswersView(
      [
        choice('retry', { label: 'Try again from where it stopped', primary: true }),
        choice('retry', { label: 'Raise the limit and try again', turnLimit: raise }),
      ],
      { answers: [{ choice: 'retry', label: 'Go again', why: 'w' }], recommendedChoice: 'retry' },
    )
    expect(view.lead?.offer.turnLimit).toBeUndefined()
    expect(view.others.map((a) => a.key)).toEqual(['retry:raise'])
  })

  it('offers the plain choices when the manager wrote none, the stop’s primary in front', () => {
    const view = processParkAnswersView(turnLimit)
    expect(view.fromManager).toBe(false)
    expect(view.lead).toMatchObject({ key: 'retry', pick: true, does: 'retry detail' })
    expect(view.lead?.note).toBeUndefined()
    expect(view.others.map((a) => a.key)).toEqual(['update-base'])
    expect(view.minor.map((a) => a.key)).toEqual(['continue', 'abandon'])
  })

  it('keeps each way on a failed step offers as its own answer, beside trying again', () => {
    const rerun = { id: 'rerun-failed-checks', label: 'Re-run failed checks', detail: 'Run them.' }
    const anyway = { id: 'merge-anyway', label: 'Merge anyway', detail: 'Merge now.' }
    const view = processParkAnswersView([
      choice('retry', { label: 'Try again', primary: true }),
      choice('recover', { label: rerun.label, detail: rerun.detail, recovery: rerun }),
      choice('recover', { label: anyway.label, detail: anyway.detail, recovery: anyway }),
      choice('continue'),
      choice('abandon'),
    ])
    expect(view.lead?.key).toBe('retry')
    expect(view.others.map((a) => [a.key, a.label])).toEqual([
      ['recover:rerun-failed-checks', 'Re-run failed checks'],
      ['recover:merge-anyway', 'Merge anyway'],
    ])
    expect(view.others[1]?.offer.recovery).toEqual(anyway)
  })

  it('lets a way on that tries the step again take an optional note for its agent, never one that decides a gate with its own text', () => {
    const here = { id: 'resolve-here', label: 'Resolve it here', detail: 'The agent tries again.' }
    const ask = {
      id: 'ask-developer',
      label: 'Ask Ana',
      detail: 'Post the message.',
      decidesGate: { gate: 'approval', action: 'send-reply', text: 'Ana, dev conflicts.' },
    }
    const view = processParkAnswersView([
      choice('retry', { label: 'Try again', primary: true }),
      choice('recover', { label: here.label, detail: here.detail, recovery: here }),
      choice('recover', { label: ask.label, detail: ask.detail, recovery: ask }),
      choice('abandon'),
    ])
    expect(view.lead).not.toHaveProperty('optionalNote')
    expect(view.others.map((a) => [a.label, a.optionalNote])).toEqual([
      ['Resolve it here', PARK_ANSWER_NOTE_LABEL],
      ['Ask Ana', undefined],
    ])
    expect(view.minor[0]).not.toHaveProperty('optionalNote')
  })

  it('offers no optional note on a way on the manager already wrote the words for', () => {
    const here = { id: 'resolve-here', label: 'Resolve it here', detail: 'The agent tries again.' }
    const view = processParkAnswersView(
      [choice('retry', { primary: true }), choice('recover', { ...here, recovery: here })],
      { answers: [{ choice: 'recover', recovery: 'resolve-here', note: 'Keep both sides.' }] },
    )
    expect(view.lead?.note).toBe('Keep both sides.')
    expect(view.lead).not.toHaveProperty('optionalNote')
  })

  it('matches the manager’s answer on a way on to that way on, by its id, and keeps the others', () => {
    const rerun = { id: 'rerun-failed-checks', label: 'Re-run failed checks', detail: 'Run them.' }
    const anyway = { id: 'merge-anyway', label: 'Merge anyway', detail: 'Merge now.' }
    const view = processParkAnswersView(
      [
        choice('retry', { label: 'Try again', primary: true }),
        choice('recover', { label: rerun.label, detail: rerun.detail, recovery: rerun }),
        choice('recover', { label: anyway.label, detail: anyway.detail, recovery: anyway }),
        choice('abandon'),
      ],
      {
        recommendedChoice: 'recover',
        answers: [
          { choice: 'recover', recovery: 'merge-anyway', why: 'Its base fails the same way.' },
          { choice: 'retry', note: 'Pin the version.' },
        ],
      },
    )
    expect(view.lead).toMatchObject({
      key: 'recover:0',
      choice: 'recover',
      label: 'Merge anyway',
      does: 'Merge now.',
      pick: true,
      why: 'Its base fails the same way.',
    })
    expect(view.lead?.offer.recovery).toEqual(anyway)
    expect(view.others.map((a) => [a.key, a.label])).toEqual([
      ['retry:1', 'Try again'],
      ['recover:rerun-failed-checks', 'Re-run failed checks'],
    ])
    expect(view.minor.map((a) => a.key)).toEqual(['abandon'])
  })

  it('drops the manager’s answer on a way on the stop does not offer', () => {
    const anyway = { id: 'merge-anyway', label: 'Merge anyway', detail: 'Merge now.' }
    const view = processParkAnswersView(
      [choice('retry', { primary: true }), choice('recover', { ...anyway, recovery: anyway })],
      { answers: [{ choice: 'recover', recovery: 'skip-review' }] },
    )
    expect(view.fromManager).toBe(false)
    expect(view.lead?.key).toBe('retry')
    expect(view.others.map((a) => a.key)).toEqual(['recover:merge-anyway'])
  })

  it('leads with the manager’s pick and its words, and keeps every choice it did not answer with', () => {
    const view = processParkAnswersView(turnLimit, {
      recommendedChoice: 'update-base',
      answers: [
        {
          choice: 'update-base',
          note: 'main has the fix; carry on.',
          why: 'It was stuck on that.',
        },
        { choice: 'retry', why: 'Not alone.' },
      ],
    })
    expect(view.fromManager).toBe(true)
    expect(view.lead).toMatchObject({
      key: 'update-base:0',
      label: 'Bring in main (2 new commits) and re-check',
      note: 'main has the fix; carry on.',
      noteLabel: 'Note for the agent',
      why: 'It was stuck on that.',
      pick: true,
    })
    expect(view.others.map((a) => [a.key, a.pick])).toEqual([['retry:1', false]])
    expect(view.minor.map((a) => a.key)).toEqual(['continue', 'abandon'])
  })

  it('marks no pick when the manager recommends none, and leads with its first answer', () => {
    const view = processParkAnswersView(turnLimit, {
      answers: [{ choice: 'retry', note: 'Try the other API.' }, { choice: 'update-base' }],
    })
    expect(view.lead).toMatchObject({ key: 'retry:0', pick: false })
    expect([...view.others, ...view.minor].some((a) => a.pick)).toBe(false)
  })

  it('puts the answer the person picked in front', () => {
    const view = processParkAnswersView(
      turnLimit,
      {
        recommendedChoice: 'update-base',
        answers: [{ choice: 'update-base' }, { choice: 'retry' }],
      },
      'retry:1',
    )
    expect(view.lead?.key).toBe('retry:1')
    expect(view.others.map((a) => a.key)).toEqual(['update-base:0'])
  })

  it('drops an answer on a choice the stop does not offer', () => {
    const view = processParkAnswersView(turnLimit, {
      answers: [{ choice: 'approve', note: 'Ship it.' }],
    })
    expect(view.fromManager).toBe(false)
    expect(view.lead?.key).toBe('retry')
  })

  it('keeps two answers on one choice apart by their own labels', () => {
    const waiting = [choice('more-info', { primary: true }), choice('delegate'), choice('abandon')]
    const view = processParkAnswersView(waiting, {
      recommendedChoice: 'delegate',
      answers: [
        { choice: 'delegate', label: 'Hand the merge to another agent', note: 'Finish the merge.' },
        { choice: 'more-info', label: 'Regenerate the schema', note: 'Run the generator.' },
        { choice: 'more-info', label: 'Skip the schema', note: 'Leave it for now.' },
      ],
    })
    expect(view.lead).toMatchObject({
      label: 'Hand the merge to another agent',
      noteLabel: 'Brief for the agent',
    })
    expect(view.others.map((a) => [a.key, a.label, a.noteLabel])).toEqual([
      ['more-info:1', 'Regenerate the schema', 'Answer for the agent'],
      ['more-info:2', 'Skip the schema', 'Answer for the agent'],
    ])
  })

  it('leads with a quiet choice when the manager picked it', () => {
    const view = processParkAnswersView(turnLimit, {
      recommendedChoice: 'continue',
      answers: [{ choice: 'continue', why: 'It is done.' }],
    })
    expect(view.lead?.key).toBe('continue:0')
    expect(view.minor.map((a) => a.key)).toEqual(['abandon'])
  })

  it('asks before an ending and carries the stop’s own offer', () => {
    const offer = choice('retry', {
      primary: true,
      turnLimit: { current: { limitTurns: true, maxTurns: 100 }, suggested: 200 },
    })
    const view = processParkAnswersView([offer, choice('abandon')])
    expect(view.lead?.offer).toBe(offer)
    expect(view.minor[0].confirm?.label).toBe('Stop the run')
  })

  it('has nothing in front when the stop offers nothing', () => {
    expect(processParkAnswersView([])).toEqual({
      lead: undefined,
      others: [],
      minor: [],
      fromManager: false,
    })
  })
})

describe('parkOwnAnswerChoice', () => {
  it('answers a waiting agent with more info before anything else', () => {
    expect(parkOwnAnswerChoice([choice('retry'), choice('more-info')])).toBe('more-info')
  })

  it('sends words with a request for changes at a gate', () => {
    expect(parkOwnAnswerChoice([choice('approve'), choice('request-changes')])).toBe(
      'request-changes',
    )
  })

  it('tries again with the words when that is all that takes them', () => {
    expect(parkOwnAnswerChoice(turnLimit)).toBe('retry')
  })

  it('offers none where no choice takes words', () => {
    expect(parkOwnAnswerChoice([choice('continue'), choice('abandon')])).toBeUndefined()
  })
})

const brk = {
  source: 'checks' as const,
  checks: ['Unit tests'],
  files: ['Tests/A.swift'],
  baseRef: 'main',
  headline: 'Tests/A.swift:1: error',
}

describe('parkAnswerIsMinor', () => {
  it('keeps carrying on and the endings quiet', () => {
    for (const c of ['continue', 'abandon', 'reject', 'close-unmerged'] as const) {
      expect(parkAnswerIsMinor(choice(c))).toBe(true)
    }
    expect(parkAnswerIsMinor(choice('retry'))).toBe(false)
  })

  it('makes leaving a break out a button, while its stop stays a quiet link', () => {
    expect(parkAnswerIsMinor(choice('continue', { preExistingBreak: brk }))).toBe(false)
    expect(parkAnswerIsMinor(choice('abandon', { preExistingBreak: brk }))).toBe(true)
    expect(parkAnswerIsMinor(choice('send-to-developer', { preExistingBreak: brk }))).toBe(false)
  })
})

describe('processParkAnswersView at a break already at the base', () => {
  it('leads with the repair, offers leaving it out beside it, and asks before it stops', () => {
    const view = processParkAnswersView([
      choice('send-to-developer', { primary: true, preExistingBreak: brk }),
      choice('continue', { preExistingBreak: brk }),
      choice('abandon', { label: 'Stop', preExistingBreak: brk }),
    ])
    expect(view.lead?.choice).toBe('send-to-developer')
    expect(view.others.map((a) => a.choice)).toEqual(['continue'])
    expect(view.minor.map((a) => [a.choice, a.label, !!a.confirm])).toEqual([
      ['abandon', 'Stop', true],
    ])
  })
})
