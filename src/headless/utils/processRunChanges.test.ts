import type { GitFileChange, ProcessRunChanges } from 'thefactory-tools/types'
import { describe, expect, it } from 'vitest'

import { GIT_DIFF_SUPPRESSED_MESSAGE } from './gitDiffConstants'
import {
  gitDiffChangeFile,
  processChangesChipLabel,
  processChangesSection,
  processChangesSummary,
} from './processRunChanges'
import { PROCESS_CHANGES_TEXT } from './processRunChangesConstants'

const file = (over: Partial<GitFileChange> = {}): GitFileChange => ({
  path: 'package.json',
  status: 'M',
  additions: 1,
  deletions: 0,
  patch: '@@ -1 +1,2 @@\n+  "policy": "require",',
  ...over,
})

const changes = (
  files: GitFileChange[],
  over: Partial<ProcessRunChanges> = {},
): ProcessRunChanges => ({
  from: 'a'.repeat(40),
  to: 'b'.repeat(40),
  landed: false,
  diff: {
    baseRef: 'a'.repeat(40),
    headRef: 'b'.repeat(40),
    files,
    insertions: files.reduce((n, f) => n + (f.additions ?? 0), 0),
    deletions: files.reduce((n, f) => n + (f.deletions ?? 0), 0),
  },
  ...over,
})

describe('gitDiffChangeFile', () => {
  it('keeps a file’s path, letter and patch', () => {
    expect(gitDiffChangeFile(file())).toEqual({
      path: 'package.json',
      status: 'M',
      patch: '@@ -1 +1,2 @@\n+  "policy": "require",',
    })
  })

  it('keeps added and deleted and maps type changes to modified', () => {
    expect(gitDiffChangeFile(file({ status: 'A' })).status).toBe('A')
    expect(gitDiffChangeFile(file({ status: 'D' })).status).toBe('D')
    expect(gitDiffChangeFile(file({ status: 'T' })).status).toBe('M')
  })

  it('preserves rename paths and line counts even when the patch is suppressed', () => {
    expect(
      gitDiffChangeFile(
        file({
          status: 'R',
          renameFrom: 'old/package.json',
          deletions: 2,
          patch: undefined,
          patchSuppressed: 'size',
        }),
      ),
    ).toEqual({
      path: 'package.json',
      status: 'R',
      oldPath: 'old/package.json',
      additions: 1,
      deletions: 2,
      note: GIT_DIFF_SUPPRESSED_MESSAGE,
    })
  })

  it('says why there is no patch', () => {
    const bare = { patch: undefined }
    expect(gitDiffChangeFile(file({ ...bare, patchSuppressed: 'size' })).note).toBe(
      GIT_DIFF_SUPPRESSED_MESSAGE,
    )
    expect(gitDiffChangeFile(file({ ...bare, binary: true })).note).toBe(
      PROCESS_CHANGES_TEXT.binary,
    )
    expect(gitDiffChangeFile(file(bare)).note).toBe(PROCESS_CHANGES_TEXT.noText)
  })
})

describe('processChangesSummary', () => {
  it('counts files and lines', () => {
    expect(processChangesSummary(changes([file()]))).toBe('1 file · +1 −0')
    expect(
      processChangesSummary(changes([file(), file({ path: 'b.ts', additions: 4, deletions: 2 })])),
    ).toBe('2 files · +5 −2')
  })

  it('says when nothing changed', () => {
    expect(processChangesSummary(changes([]))).toBe(PROCESS_CHANGES_TEXT.none)
  })
})

describe('processChangesChipLabel', () => {
  it('names the files once they are read, and none when there are none', () => {
    expect(processChangesChipLabel(undefined)).toBe('Changes')
    expect(processChangesChipLabel(0)).toBe('Changes · none')
    expect(processChangesChipLabel(1)).toBe('Changes · 1 file')
    expect(processChangesChipLabel(3)).toBe('Changes · 3 files')
  })
})

describe('processChangesSection', () => {
  it('lists each file with its lines, open, under the summary', () => {
    const section = processChangesSection(
      changes([
        file(),
        file({ path: 'src/a.ts', status: 'A', additions: 3, deletions: undefined }),
      ]),
    )

    expect(section).toEqual({
      title: PROCESS_CHANGES_TEXT.title,
      summary: '2 files · +4 −0',
      body: {
        rows: [
          { key: 'package.json', path: 'package.json', status: 'M', stat: '+1 −0' },
          { key: 'src/a.ts', path: 'src/a.ts', status: 'A', stat: '+3 −0' },
        ],
        note: undefined,
      },
      open: true,
      attention: false,
    })
  })

  it('says so when the test seams could not be left out', () => {
    expect(processChangesSection(changes([file()], { seamsIncluded: true })).body.note).toBe(
      PROCESS_CHANGES_TEXT.seamsIncluded,
    )
  })

  it('reads as no changes, closed, when nothing changed', () => {
    expect(processChangesSection(changes([]))).toMatchObject({
      summary: PROCESS_CHANGES_TEXT.none,
      body: { rows: [] },
      open: false,
    })
  })
})
