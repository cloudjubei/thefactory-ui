import { describe, expect, it } from 'vitest'

import { FAKE_RUN_THROUGH_FIXES_STORY_ID, FakeRunThroughReview } from './FakeRunThroughReview'
import { FAKE_RUN_THROUGH_ISSUES } from './fixtures/runThroughRun'

const [BLOCKER, MAJOR, MINOR] = FAKE_RUN_THROUGH_ISSUES.map((ref) => ref.id) as [
  string,
  string,
  string,
]

describe('FakeRunThroughReview', () => {
  it('starts parked at the sign-off with nothing answered', () => {
    const review = new FakeRunThroughReview()
    expect(review.run()).toMatchObject({ status: 'parked', park: { reason: 'gate' } })
    expect(review.run().issueAnswers).toBeUndefined()
  })

  it('keeps each answer, a later one replacing the earlier, with the words trimmed', () => {
    const review = new FakeRunThroughReview()
    review.answer(BLOCKER, { answer: 'not-an-issue' })
    const result = review.answer(BLOCKER, { answer: 'fix', note: '  Say what is wrong  ' })
    expect(result.ok && result.run.issueAnswers?.[BLOCKER]).toMatchObject({
      answer: 'fix',
      note: 'Say what is wrong',
    })
  })

  it('refuses an issue it does not hold and an answer that is not one', () => {
    const review = new FakeRunThroughReview()
    expect(review.answer('nope', { answer: 'fix' })).toMatchObject({ ok: false, status: 404 })
    expect(review.answer(BLOCKER, { answer: 'maybe' })).toMatchObject({ ok: false, status: 400 })
  })

  it('refuses to finish while an issue is open', () => {
    const review = new FakeRunThroughReview()
    review.answer(BLOCKER, { answer: 'fix' })
    expect(review.finish()).toMatchObject({ ok: false, status: 400 })
    expect(review.run().status).toBe('parked')
  })

  it('makes a story of the fixes and closes the run once all are answered, once', () => {
    const review = new FakeRunThroughReview()
    review.answer(BLOCKER, { answer: 'fix' })
    review.answer(MAJOR, { answer: 'fix', note: 'Show the rules from the start' })
    review.answer(MINOR, { answer: 'not-an-issue' })
    const result = review.finish()
    expect(result.ok && result.run).toMatchObject({
      status: 'succeeded',
      issueReview: { storyId: FAKE_RUN_THROUGH_FIXES_STORY_ID, fixes: 2, notIssues: 1 },
    })
    expect(result.ok && result.run.park).toBeUndefined()
    const [story] = review.stories(review.run().projectId)
    expect(story?.title).toBe('Fix what “Run through sign-up as a new user” met')
    expect(story?.features).toHaveLength(2)
    expect(story?.features[1]?.acceptance).toContain('Show the rules from the start')
    expect(review.finish()).toEqual(result)
    expect(review.answer(BLOCKER, { answer: 'not-an-issue' })).toMatchObject({ ok: false })
  })

  it('makes no story when nothing is to be fixed, and none in another project', () => {
    const review = new FakeRunThroughReview()
    for (const id of [BLOCKER, MAJOR, MINOR]) review.answer(id, { answer: 'not-an-issue' })
    const result = review.finish()
    expect(result.ok && result.run.issueReview).toMatchObject({ fixes: 0, notIssues: 3 })
    expect(result.ok && result.run.issueReview?.storyId).toBeUndefined()
    expect(review.stories(review.run().projectId)).toEqual([])
    expect(review.stories('elsewhere')).toEqual([])
  })
})
