import { describe, expect, it } from 'vitest'

import { chatChangesHeader } from './chatChangesHeader'
import { CHAT_CHANGES_HEADER_COPY } from './chatChangesHeaderConstants'

describe('chatChangesHeader', () => {
  it('says whose changes they are, how many files, and the branch they wait on', () => {
    expect(chatChangesHeader({ fileCount: 1, branch: 'agent/84b6fd5bb3cd' })).toEqual({
      title: 'Changes this chat’s agent made',
      meta: '1 file · on its own branch',
      branch: 'agent/84b6fd5bb3cd',
    })
  })

  it('counts several files', () => {
    expect(chatChangesHeader({ fileCount: 3, branch: 'agent/x' }).meta).toBe(
      '3 files · on its own branch',
    )
  })

  it('names no branch for changes that are on none — not committed yet, or a project with no git of its own', () => {
    expect(chatChangesHeader({ fileCount: 2 })).toEqual({
      title: CHAT_CHANGES_HEADER_COPY.title,
      meta: '2 files',
    })
    expect(chatChangesHeader({ fileCount: 2, branch: 'agent/x', shadow: true })).toEqual({
      title: CHAT_CHANGES_HEADER_COPY.title,
      meta: '2 files',
    })
  })

  it('never reads as a process run’s sign-off, and never says land', () => {
    const { title, meta } = chatChangesHeader({ fileCount: 1, branch: 'agent/x' })
    for (const text of [title, meta]) {
      expect(text).not.toMatch(/sign-?off/i)
      expect(text).not.toMatch(/\bland(s|ed|ing)?\b/i)
    }
  })
})
