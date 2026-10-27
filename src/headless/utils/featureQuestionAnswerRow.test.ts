import { describe, expect, it } from 'vitest'
import { featureQuestionAnswerMilestone } from './featureQuestionAnswerRow'
import { FEATURE_QUESTION_ANSWER_ROW_COPY } from './featureQuestionAnswerRowConstants'

const saved = { answered: true, storyId: 's1', featureId: 'f1', questionId: 'q1' }

describe('featureQuestionAnswerMilestone', () => {
  it('says the answer was saved and the work carried on', () => {
    expect(featureQuestionAnswerMilestone({ ...saved, carriedOn: true }, 'success', false)).toEqual(
      { tone: 'success', title: 'Answer saved', detail: 'The work carried on' },
    )
  })

  it('counts the questions the work still waits on', () => {
    expect(featureQuestionAnswerMilestone({ ...saved, stillOpen: 1 }, 'success', false)).toEqual({
      tone: 'success',
      title: 'Answer saved',
      detail: 'The work waits on 1 more question',
    })
    expect(
      featureQuestionAnswerMilestone({ ...saved, stillOpen: 3 }, 'success', false)?.detail,
    ).toBe('The work waits on 3 more questions')
  })

  it('warns, with why, when the work did not carry on', () => {
    expect(
      featureQuestionAnswerMilestone(
        { ...saved, carriedOn: false, why: ' The run was stopped. ' },
        'success',
        false,
      ),
    ).toEqual({
      tone: 'warning',
      title: 'Answer saved',
      detail: 'The work did not carry on: The run was stopped.',
    })
    expect(
      featureQuestionAnswerMilestone({ ...saved, carriedOn: false }, 'success', false),
    ).toEqual({
      tone: 'warning',
      title: 'Answer saved',
    })
  })

  it('says only that the answer was saved when no work waited on it', () => {
    expect(featureQuestionAnswerMilestone(saved, 'success', false)).toEqual({
      tone: 'success',
      title: FEATURE_QUESTION_ANSWER_ROW_COPY.saved,
    })
    expect(featureQuestionAnswerMilestone({ ...saved, stillOpen: 0 }, 'success', false)).toEqual({
      tone: 'success',
      title: FEATURE_QUESTION_ANSWER_ROW_COPY.saved,
    })
  })

  it('reads a result sent as JSON text', () => {
    expect(
      featureQuestionAnswerMilestone(
        JSON.stringify({ ...saved, carriedOn: true }),
        'success',
        false,
      )?.detail,
    ).toBe('The work carried on')
    expect(featureQuestionAnswerMilestone('not json', 'success', false)).toBeUndefined()
  })

  it('shows nothing while asked, on a failure, or for a result that saved no answer', () => {
    expect(
      featureQuestionAnswerMilestone({ ...saved, carriedOn: true }, 'success', true),
    ).toBeUndefined()
    expect(
      featureQuestionAnswerMilestone(
        { error: 'That question is answered already.' },
        'errored',
        false,
      ),
    ).toBeUndefined()
    expect(featureQuestionAnswerMilestone({ answered: false }, 'success', false)).toBeUndefined()
    expect(featureQuestionAnswerMilestone(['answered'], 'success', false)).toBeUndefined()
    expect(featureQuestionAnswerMilestone(undefined, undefined, false)).toBeUndefined()
  })
})
