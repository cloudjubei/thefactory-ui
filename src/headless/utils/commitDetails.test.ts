import { describe, expect, it } from 'vitest'

import { commitChangesLabel, commitDetailsState, commitGitViewPath } from './commitDetails'
import { COMMIT_DETAILS_TEXT } from './commitDetailsConstants'

const SHA = 'de6c01c171f149c5dc1dea1e411cedf8afb88a33'

const commit = {
  hash: SHA,
  subject: 'North Star program dashboard',
  authorName: 'cloudjubei-ai',
  authorDate: 1791370743000,
}

const ok = <T>(value: T) => ({ ok: true as const, value })
const failed = (error: unknown) => ({ ok: false as const, error })
const httpError = (status: number, code?: string) => ({
  response: { status, data: { error: 'nope', ...(code ? { code } : {}) } },
})

describe('commitDetailsState', () => {
  it('reads the commit and what it changed against its parent', () => {
    expect(
      commitDetailsState(
        SHA,
        ok({ commits: [commit] }),
        ok({ files: [{}, {}, {}], insertions: 120, deletions: 4 }),
      ),
    ).toEqual({
      status: 'ready',
      details: {
        sha: SHA,
        shortSha: 'de6c01c1',
        subject: 'North Star program dashboard',
        authorName: 'cloudjubei-ai',
        authorDate: 1791370743000,
        changes: { files: 3, insertions: 120, deletions: 4 },
      },
    })
  })

  it('keeps the commit when what it changed could not be read — a root commit has no parent', () => {
    const state = commitDetailsState(
      SHA,
      ok({ commits: [commit] }),
      failed(httpError(409, 'GIT_REF_UNAVAILABLE')),
    )
    expect(state.status).toBe('ready')
    expect(state.status === 'ready' && state.details.changes).toBeUndefined()
  })

  it('accepts a commit named by a prefix of its sha', () => {
    const state = commitDetailsState(SHA.slice(0, 8), ok({ commits: [commit] }), failed('x'))
    expect(state.status === 'ready' && state.details.sha).toBe(SHA)
  })

  it('says the commit is not here when the log reads another commit', () => {
    expect(
      commitDetailsState(
        SHA,
        ok({ commits: [{ ...commit, hash: 'a'.repeat(40) }] }),
        ok({ files: [], insertions: 0, deletions: 0 }),
      ),
    ).toEqual({ status: 'missing' })
  })

  it('says the commit is not here when the log reads nothing', () => {
    expect(commitDetailsState(SHA, ok({ commits: [] }), failed('x'))).toEqual({
      status: 'missing',
    })
  })

  it('says the commit is not here when git cannot find it locally', () => {
    expect(
      commitDetailsState(
        SHA,
        failed(httpError(500)),
        failed(httpError(409, 'GIT_REF_UNAVAILABLE')),
      ),
    ).toEqual({ status: 'missing' })
  })

  it('reports a failure that is not a missing commit, in the server’s words', () => {
    expect(commitDetailsState(SHA, failed(httpError(500)), failed(httpError(500)))).toEqual({
      status: 'failed',
      message: 'nope',
    })
  })

  it('falls back to a plain message when the failure says nothing', () => {
    expect(commitDetailsState(SHA, failed(undefined), failed(undefined))).toEqual({
      status: 'failed',
      message: COMMIT_DETAILS_TEXT.failed,
    })
  })
})

describe('commitChangesLabel', () => {
  it('counts files in the plural', () => {
    expect(commitChangesLabel({ files: 3, insertions: 1, deletions: 0 })).toBe('3 files changed')
  })

  it('counts one file in the singular', () => {
    expect(commitChangesLabel({ files: 1, insertions: 1, deletions: 0 })).toBe('1 file changed')
  })
})

describe('commitGitViewPath', () => {
  it('opens the commit in the project’s Git view', () => {
    expect(commitGitViewPath('thefactory-knowledge', SHA)).toBe(
      `/projects/thefactory-knowledge/git?commit=${SHA}`,
    )
  })
})
