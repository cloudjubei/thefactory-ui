import { describe, expect, it } from 'vitest'
import {
  classifyPendingFileChange,
  fileChangeConcernsPath,
  fileChangeDeletedPath,
  fileChangeOriginOf,
  fileChangeRenamedTo,
  mergeFileText,
  pendingFileChangeActions,
  pendingFileChangeSummary,
} from './pendingFileChange'

const base = 'one\ntwo\nthree\nfour\n'

describe('mergeFileText', () => {
  it('merges disjoint edits without changing line endings or the end of file', () => {
    expect(
      mergeFileText('one\r\ntwo\r\nthree', 'ONE\r\ntwo\r\nthree', 'one\r\ntwo\r\nTHREE'),
    ).toEqual([{ type: 'text', text: 'ONE\r\ntwo\r\nTHREE' }])
  })

  it('groups transitive overlaps and keeps disjoint edits out of the conflict', () => {
    expect(mergeFileText(base, 'ONE\ntwo\nTHREE\nfour\n', 'REMOTE\nFOUR\n')).toEqual([
      { type: 'conflict', ours: 'ONE\ntwo\nTHREE\nfour\n', theirs: 'REMOTE\nFOUR\n' },
    ])
  })

  it('does not concatenate an unterminated replacement with an appended line', () => {
    expect(mergeFileText('one\n', 'ONE', 'one\nnext\n')).toEqual([
      { type: 'conflict', ours: 'ONE', theirs: 'one\nnext\n' },
    ])
  })

  it('represents deleted lines and simultaneous insertions without adding newlines', () => {
    expect(mergeFileText('one\ntwo', 'one\n', 'one\nother')).toEqual([
      { type: 'text', text: 'one\n' },
      { type: 'conflict', ours: '', theirs: 'other' },
    ])
    expect(mergeFileText('', 'first', 'second')).toEqual([
      { type: 'conflict', ours: 'first', theirs: 'second' },
    ])
  })
})

describe('pending file change', () => {
  it.each([
    ['ONE\ntwo\nthree\nfour\n', 'one\nTWO\nthree\nfour\n', 'clean'],
    ['ONE\ntwo\nthree\nfour\n', 'OTHER\ntwo\nthree\nfour\n', 'conflict'],
    ['one\nadded\ntwo\nthree\nfour\n', 'one\nelse\ntwo\nthree\nfour\n', 'conflict'],
    ['one\nadded\ntwo\nthree\nfour\n', 'one\nadded\ntwo\nthree\nFOUR\n', 'clean'],
    ['one\ntwo\nthree\nFOUR\n', 'one\ntwo\nthree\nFOUR', 'conflict'],
    ['one\ntwo\nthree\nFOUR\n', null, 'deleted'],
  ] as const)('classifies draft %j and remote %j as %s', (draft, remote, kind) => {
    expect(classifyPendingFileChange(base, draft, remote)).toMatchObject({ kind, remote })
  })

  it('counts disjoint remote hunks and counts each overlapping remote hunk once', () => {
    expect(
      classifyPendingFileChange(base, 'ONE\ntwo\nTHREE\nfour\n', 'REMOTE\nthree\nFOUR\n'),
    ).toMatchObject({
      kind: 'conflict',
      hunks: 2,
      conflicts: 1,
    })
    const sameEdit = 'ONE\ntwo\nthree\nfour\n'
    expect(classifyPendingFileChange(base, sameEdit, sameEdit)).toMatchObject({
      hunks: 1,
      conflicts: 0,
    })
  })

  it('does not invent counts when diff work is capped', () => {
    expect(classifyPendingFileChange(base, 'x'.repeat(200_001), 'remote')).toMatchObject({
      kind: 'conflict',
      hunks: null,
      conflicts: null,
    })
  })

  it('matches changed paths, including either end of a rename and legacy invalidations', () => {
    expect(fileChangeConcernsPath({ paths: ['a.txt', 'b.txt'] }, 'a.txt')).toBe(true)
    expect(fileChangeConcernsPath({ path: 'a.txt' }, 'b.txt')).toBe(false)
    expect(fileChangeConcernsPath({ path: '' }, 'b.txt')).toBe(true)
    expect(fileChangeConcernsPath({ moves: [{ src: 'a.txt', dst: 'b.txt' }] }, 'a.txt')).toBe(true)
    expect(fileChangeConcernsPath({ queries: [{ path: 'a.txt' }] }, 'b.txt')).toBe(false)
  })

  it('extracts remote rename destinations and explains delete and rename callout states', () => {
    expect(
      fileChangeRenamedTo(
        { action: 'renamed', moves: [{ src: 'notes.txt', dst: 'docs/notes.txt' }] },
        'notes.txt',
      ),
    ).toBe('docs/notes.txt')
    expect(
      fileChangeRenamedTo(
        { action: 'renamed', moves: [{ src: 'notes.txt', dst: 'notes.txt' }] },
        'notes.txt',
      ),
    ).toBeUndefined()
    expect(
      fileChangeDeletedPath({ action: 'deleted', paths: ['docs/notes.txt'] }, 'docs/notes.txt'),
    ).toBe(true)
    expect(
      fileChangeDeletedPath({ action: 'written', paths: ['docs/notes.txt'] }, 'docs/notes.txt'),
    ).toBe(false)

    expect(
      pendingFileChangeSummary({
        kind: 'deleted',
        remote: null,
        origin: { kind: 'agent', runId: 'run-7' },
      }),
    ).toEqual({
      headline: 'File deleted remotely',
      overlap:
        'If it was renamed or moved, it is treated as a delete here and a new file at the new path.',
      source: 'Source: Agent run run-7',
    })

    expect(
      pendingFileChangeSummary({
        kind: 'deleted',
        remote: null,
        renamedTo: 'docs/notes.txt',
        origin: { kind: 'person' },
      }),
    ).toEqual({
      headline: 'File renamed or moved remotely',
      overlap: 'Moved to docs/notes.txt. Treated as a delete here and a new file at the new path.',
      source: 'Source: A person',
    })

    expect(
      pendingFileChangeSummary({
        kind: 'clean',
        remote: 'remote',
        hunks: 1,
        conflicts: 0,
        renamedTo: 'docs/notes.txt',
        origin: { kind: 'person' },
      }),
    ).toEqual({
      headline: '1 hunk changed remotely',
      overlap: '0 conflicts with your edits. Moved to docs/notes.txt.',
      source: 'Source: A person',
    })

    expect(pendingFileChangeActions({ kind: 'deleted', remote: null }).map((a) => a.label)).toEqual(
      ['Recreate on save', 'Discard mine'],
    )
  })

  it('reads a generated file-change origin, including an agent chat, and ignores a missing one', () => {
    expect(
      fileChangeOriginOf({
        origin: { kind: 'agent', runId: 'run-7', chatContextId: 'chat-7' },
      }),
    ).toEqual({ kind: 'agent', runId: 'run-7', chatContextId: 'chat-7' })
    expect(fileChangeOriginOf({ origin: { kind: 'agent', runId: 'run-7' } })).toEqual({
      kind: 'agent',
      runId: 'run-7',
    })
    expect(
      fileChangeOriginOf({ origin: { kind: 'agent', runId: 'run-7', chatContextId: ' ' } }),
    ).toEqual({ kind: 'agent', runId: 'run-7' })
    expect(fileChangeOriginOf({ origin: { kind: 'chat', chatContextId: 'chat-7' } })).toEqual({
      kind: 'chat',
      chatContextId: 'chat-7',
    })
    expect(fileChangeOriginOf({ origin: { kind: 'person' } })).toEqual({ kind: 'person' })
    expect(fileChangeOriginOf({ path: 'notes.txt' })).toBeUndefined()
    expect(fileChangeOriginOf({ origin: { kind: 'agent', runId: ' ' } })).toBeUndefined()

    expect(
      pendingFileChangeSummary({
        kind: 'conflict',
        remote: 'remote',
        hunks: 1,
        conflicts: 0,
        origin: { kind: 'agent', runId: 'run-7', chatContextId: 'chat-7' },
      }).source,
    ).toBe('Source: Agent run run-7 · chat chat-7')
  })
})
