import { describe, expect, it } from 'vitest'
import type { ProcessParkChoice } from 'thefactory-tools/types'

import { parkOwnAnswerChoice, processParkAnswersView } from './processParkAnswers'

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
  it('offers the plain choices when the manager wrote none, the stop’s primary in front', () => {
    const view = processParkAnswersView(turnLimit)
    expect(view.fromManager).toBe(false)
    expect(view.lead).toMatchObject({ key: 'retry', pick: true, does: 'retry detail' })
    expect(view.lead?.note).toBeUndefined()
    expect(view.others.map((a) => a.key)).toEqual(['update-base'])
    expect(view.minor.map((a) => a.key)).toEqual(['continue', 'abandon'])
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
