import { describe, expect, it } from 'vitest'
import { STORY_STATUSES } from 'thefactory-tools/constants'

import {
  SETTABLE_STATUS_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  isStoryStatus,
  statusKey,
  statusLabel,
} from './status'

describe('status vocabulary', () => {
  it('shows reviewable in the review palette, labelled for what it is', () => {
    expect(statusKey('reviewable')).toBe('review')
    expect(statusLabel('reviewable')).toBe('Reviewable')
  })

  it('keeps done green and in progress working, so verified work never reads as done', () => {
    expect(statusKey('done')).toBe('done')
    expect(statusKey('in_progress')).toBe('working')
    expect(statusKey('reviewable')).not.toBe(statusKey('done'))
  })

  it('orders the lifecycle as it runs: pending, working, reviewable, done, then the set-asides', () => {
    expect(STATUS_ORDER).toEqual([
      'pending',
      'in_progress',
      'reviewable',
      'done',
      'deferred',
      'blocked',
    ])
  })

  it('labels and orders every status the SDK stores', () => {
    expect([...STATUS_ORDER].sort()).toEqual([...STORY_STATUSES].sort())
    for (const status of STORY_STATUSES) expect(STATUS_LABELS[status]).toBeTruthy()
  })

  it('never offers a person the statuses only the process sets', () => {
    expect(SETTABLE_STATUS_ORDER).toEqual(['pending', 'done', 'deferred', 'blocked'])
  })

  it('recognises every stored status and nothing else', () => {
    for (const status of STORY_STATUSES) expect(isStoryStatus(status)).toBe(true)
    expect(isStoryStatus('+')).toBe(false)
    expect(isStoryStatus('')).toBe(false)
  })

  it('falls back to the raw value for a label it does not know', () => {
    expect(statusLabel('wat')).toBe('wat')
  })
})
