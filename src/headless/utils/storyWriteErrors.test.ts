import { describe, expect, it } from 'vitest'

import { attemptStoryChange, featureWriteError, storyChangeErrorText } from './storyWriteErrors'
import { FEATURE_WRITE_FAILED, STORY_CHANGE_FAILED } from './storyWriteErrorsConstants'

describe('featureWriteError — a feature change the backend refused, in its words', () => {
  it('carries the refusal the backend sent as its body', () => {
    const refused = featureWriteError({
      error: 'Cannot defer "Dashboard" while it is in a live run and already started.',
    })
    expect(refused).toBeInstanceOf(Error)
    expect(refused.message).toBe(
      'Cannot defer "Dashboard" while it is in a live run and already started.',
    )
  })

  it('carries the refusal an axios-style failure holds in its response', () => {
    expect(
      featureWriteError({
        isAxiosError: true,
        response: { status: 409, data: { error: 'Not while the run works it.' } },
      }).message,
    ).toBe('Not while the run works it.')
  })

  it('keeps an error’s own message, and falls back to plain words', () => {
    expect(featureWriteError(new Error('offline')).message).toBe('offline')
    expect(featureWriteError(undefined).message).toBe(FEATURE_WRITE_FAILED)
  })
})

describe('storyChangeErrorText — why a story or feature change failed, as the person reads it', () => {
  it('reads the refusal the backend sent as its body', () => {
    expect(storyChangeErrorText({ error: 'Cannot defer "F" while it is in a live run.' })).toBe(
      'Cannot defer "F" while it is in a live run.',
    )
  })

  it('reads the refusal an axios-style failure holds in its response', () => {
    expect(
      storyChangeErrorText({
        isAxiosError: true,
        response: { status: 409, data: { error: 'Not while the run works it.' } },
      }),
    ).toBe('Not while the run works it.')
  })

  it('keeps an error’s own words — a feature write already carries the backend’s', () => {
    expect(storyChangeErrorText(featureWriteError({ error: 'Refused by the run.' }))).toBe(
      'Refused by the run.',
    )
    expect(storyChangeErrorText(undefined)).toBe(STORY_CHANGE_FAILED)
  })
})

describe('attemptStoryChange — a change whose failure the person is shown', () => {
  it('clears the last error, makes the change and reports nothing more when it goes through', async () => {
    const reported: (string | undefined)[] = []
    const ok = await attemptStoryChange(
      async () => 'done',
      (e) => reported.push(e),
    )
    expect(ok).toBe(true)
    expect(reported).toEqual([undefined])
  })

  it('reports why the change failed, in the backend’s words, and never throws', async () => {
    const reported: (string | undefined)[] = []
    const ok = await attemptStoryChange(
      async () => {
        throw { error: 'Cannot defer "F" while it is in a live run.' }
      },
      (e) => reported.push(e),
    )
    expect(ok).toBe(false)
    expect(reported).toEqual([undefined, 'Cannot defer "F" while it is in a live run.'])
  })

  it('clears the last error before the change starts', async () => {
    const order: string[] = []
    await attemptStoryChange(
      async () => {
        order.push('change')
      },
      (e) => order.push(e === undefined ? 'clear' : 'error'),
    )
    expect(order).toEqual(['clear', 'change'])
  })
})
