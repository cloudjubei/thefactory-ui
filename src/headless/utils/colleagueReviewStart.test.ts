import { describe, expect, it } from 'vitest'
import {
  reviewChatContext,
  reviewDraftProblem,
  reviewOfChat,
  reviewStartLabel,
  withReviewFiles,
} from './colleagueReviewStart'
import { COLLEAGUE_REVIEW_FILES_MAX } from './colleagueReviewStartConstants'

const file = (name: string, size = 10) => ({ name, size, uri: `file:///${name}` })

describe('reviewChatContext', () => {
  it('is the ticket’s review topic in the group', () => {
    expect(reviewChatContext('osc', 'ZNR-809')).toEqual({
      type: 'GROUP_TOPIC',
      groupId: 'osc',
      topicId: 'review-ZNR-809',
    })
  })
})

describe('reviewOfChat', () => {
  it('reads the review from a review chat’s context or its id', () => {
    expect(reviewOfChat(reviewChatContext('osc', 'ZNR-809'))).toEqual({
      groupId: 'osc',
      ticketKey: 'ZNR-809',
    })
    expect(reviewOfChat('groups/osc/topics/review-ZNR-809')).toEqual({
      groupId: 'osc',
      ticketKey: 'ZNR-809',
    })
  })

  it('finds none in any other chat', () => {
    expect(reviewOfChat('groups/osc/topics/ticket-ZNR-809')).toBeUndefined()
    expect(reviewOfChat('groups/osc/topics/review-')).toBeUndefined()
    expect(reviewOfChat({ type: 'GROUP', groupId: 'osc' })).toBeUndefined()
    expect(reviewOfChat({ type: 'GROUP_TOPIC', topicId: 'review-A-1' })).toBeUndefined()
    expect(reviewOfChat(undefined)).toBeUndefined()
  })
})

describe('reviewStartLabel', () => {
  it('counts the files going up, then says the round is starting', () => {
    expect(reviewStartLabel({ step: 'uploading', done: 2, total: 6 })).toBe('Files 2/6…')
    expect(reviewStartLabel({ step: 'starting' })).toBe('Starting…')
  })
})

describe('reviewDraftProblem', () => {
  it('wants some text, no more than the backend takes', () => {
    expect(reviewDraftProblem({ text: '  \n', files: [] })).toBe('Paste their update first.')
    expect(reviewDraftProblem({ text: 'x'.repeat(100_001), files: [] })).toBe(
      'The update is longer than 100,000 characters.',
    )
    expect(
      reviewDraftProblem({
        text: 'ok',
        files: Array.from({ length: COLLEAGUE_REVIEW_FILES_MAX + 1 }, (_, i) => ({
          file: file(`${i}.png`),
        })),
      }),
    ).toBe('Up to 50 files.')
    expect(
      reviewDraftProblem({ text: 'ok', files: [{ file: file('huge.mp4', 3 * 1024 ** 3) }] }),
    ).toMatch(/^huge\.mp4 /)
    expect(
      reviewDraftProblem({ text: 'ok', files: [{ file: { name: 'clip.mp4', uri: 'file:///c' } }] }),
    ).toBeUndefined()
    expect(reviewDraftProblem({ text: 'Done, see PR 390.', files: [] })).toBeUndefined()
  })
})

describe('withReviewFiles', () => {
  it('adds files once each, keeping those already uploaded', () => {
    const kept = [{ file: file('a.png'), path: 'up/a.png' }]
    expect(withReviewFiles(kept, [file('a.png'), file('b.md'), file('a.png', 11)])).toEqual([
      { file: file('a.png'), path: 'up/a.png' },
      { file: file('b.md') },
      { file: file('a.png', 11) },
    ])
  })

  it('stops at the backend’s limit', () => {
    const many = Array.from({ length: COLLEAGUE_REVIEW_FILES_MAX + 5 }, (_, i) => file(`${i}.png`))
    expect(withReviewFiles([], many)).toHaveLength(COLLEAGUE_REVIEW_FILES_MAX)
  })
})
