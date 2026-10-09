import { describe, expect, it } from 'vitest'
import type { SearchHit, SearchRecord } from '../api'
import type { ProjectSearchRecordRow } from './projectSearchTypes'
import {
  fileHitLines,
  isSearchableQuery,
  projectSearchGroups,
  projectSearchRows,
  projectSearchStatus,
  projectSearchSummary,
  searchExcerpt,
  searchMatchSegments,
  searchRecordChip,
  searchRecordLink,
  stepSearchCursor,
} from './projectSearch'
import { PROJECT_SEARCH_EXCERPT_MAX_CHARS } from './projectSearchConstants'

const story: SearchRecord = {
  kind: 'story',
  projectId: 'p1',
  storyId: 's1',
  title: 'Login',
  status: 'in_progress',
}
const feature: SearchRecord = {
  kind: 'feature',
  projectId: 'p1',
  storyId: 's1',
  featureId: 'f1',
  title: 'Remember me',
  status: 'done',
}
const groupNote: SearchRecord = {
  kind: 'groupNote',
  groupId: 'g1',
  noteId: 'gn1',
  title: 'Shared staging login',
  access: 'open',
  author: 'agent',
}
const note: SearchRecord = {
  kind: 'note',
  projectId: 'p1',
  noteId: 'n1',
  title: 'QA login',
  access: 'ask',
  author: 'user',
}

describe('searchRecordLink', () => {
  it('links each record to what it names', () => {
    expect(searchRecordLink(story)).toEqual({ kind: 'story', projectId: 'p1', storyId: 's1' })
    expect(searchRecordLink(feature)).toEqual({
      kind: 'feature',
      projectId: 'p1',
      storyId: 's1',
      featureId: 'f1',
    })
    expect(searchRecordLink(note)).toEqual({ kind: 'note', projectId: 'p1', noteId: 'n1' })
    expect(searchRecordLink(groupNote)).toEqual({ kind: 'groupNote', groupId: 'g1', noteId: 'gn1' })
  })
})

describe('fileHitLines', () => {
  it('names the line that matched, else the lines of the passage', () => {
    expect(
      fileHitLines({ path: 'a', startLine: 2, endLine: 9, snippet: { line: 4, text: 'x' } }),
    ).toBe('Line 4')
    expect(fileHitLines({ path: 'a', startLine: 40, endLine: 58 })).toBe('Lines 40–58')
    expect(fileHitLines({ path: 'a', startLine: 7, endLine: 7 })).toBe('Line 7')
    expect(fileHitLines({ path: 'a', startLine: 7 })).toBe('Line 7')
  })

  it('names nothing when the search did not say where', () => {
    expect(fileHitLines({ path: 'a' })).toBeUndefined()
  })
})

describe('projectSearchGroups', () => {
  const hits: SearchHit[] = [
    { record: groupNote, reference: '&group:g1/gn1', text: 'staging login' },
    { record: note, reference: '&n1', text: 'user qa@example.com, password in the vault' },
    { path: 'src/login.ts', startLine: 3, endLine: 9, snippet: { line: 5, text: 'login()' } },
    { record: story, reference: '#s1', text: 'Login\nLet people sign in' },
    { path: 'README.md' },
    { record: feature, reference: '#s1.f1' },
  ]

  it('lists files, stories, features, notes then group notes, each as the search ranked them', () => {
    const groups = projectSearchGroups(hits, 'login')
    expect(groups.map((g) => [g.key, g.label, g.rows.length])).toEqual([
      ['file', 'Files', 2],
      ['story', 'Stories', 1],
      ['feature', 'Features', 1],
      ['note', 'Notes', 1],
      ['groupNote', 'Group notes', 1],
    ])
    expect(groups[0].rows.map((r) => r.key)).toEqual(['file:src/login.ts', 'file:README.md'])
  })

  it('opens a file at the line that matched, else at the start of its passage', () => {
    const [files] = projectSearchGroups(
      [...hits, { path: 'docs/a.md', startLine: 12, endLine: 20 }],
      'login',
    )
    expect(files.rows.map((r) => r.target)).toEqual([
      { type: 'file', path: 'src/login.ts', line: 5 },
      { type: 'file', path: 'README.md' },
      { type: 'file', path: 'docs/a.md', line: 12 },
    ])
    expect(files.rows[0]).toMatchObject({ kind: 'file', lines: 'Line 5', snippet: { line: 5 } })
  })

  it('opens a record by its link and shows its status and the text around the query', () => {
    const rows = projectSearchGroups(hits, 'password').flatMap((g) => g.rows)
    expect(rows.find((r) => r.key === 'record:#s1')).toMatchObject({
      kind: 'record',
      status: 'in_progress',
      target: { type: 'resource', link: { kind: 'story', projectId: 'p1', storyId: 's1' } },
    })
    expect(rows.find((r) => r.key === 'record:&n1')).toMatchObject({
      excerpt: 'user qa@example.com, password in the vault',
    })
    const noteRow = rows.find((r) => r.key === 'record:&n1')
    expect(noteRow && 'status' in noteRow).toBe(false)
    const featureRow = rows.find((r) => r.key === 'record:#s1.f1')
    expect(featureRow && 'excerpt' in featureRow).toBe(false)
  })

  it('leaves out headings with nothing under them', () => {
    expect(
      projectSearchGroups([{ record: note, reference: '&n1' }], 'qa').map((g) => g.key),
    ).toEqual(['note'])
    expect(projectSearchGroups([], 'qa')).toEqual([])
  })

  it('flattens the groups into the rows the keyboard moves through', () => {
    expect(projectSearchRows(projectSearchGroups(hits, 'login')).map((r) => r.key)).toEqual([
      'file:src/login.ts',
      'file:README.md',
      'record:#s1',
      'record:#s1.f1',
      'record:&n1',
      'record:&group:g1/gn1',
    ])
  })
})

describe('searchExcerpt', () => {
  it('keeps a short text whole, its whitespace folded', () => {
    expect(searchExcerpt('Login\n\n  Let   people in', 'people')).toBe('Login Let people in')
  })

  it('cuts a long text around the first word of the query', () => {
    const text = `${'a '.repeat(200)}needle ${'b '.repeat(200)}`
    const excerpt = searchExcerpt(text, 'zzz needle')
    expect(excerpt).toContain('needle')
    expect(excerpt.startsWith('…')).toBe(true)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt.length).toBeLessThanOrEqual(PROJECT_SEARCH_EXCERPT_MAX_CHARS + 2)
  })

  it('cuts a long text from its start when the query is not in it', () => {
    const excerpt = searchExcerpt('c'.repeat(400), 'needle')
    expect(excerpt.startsWith('c')).toBe(true)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt.length).toBe(PROJECT_SEARCH_EXCERPT_MAX_CHARS + 1)
  })

  it('does not lead with an ellipsis when the match is near the start', () => {
    const excerpt = searchExcerpt(`needle ${'d'.repeat(400)}`, 'needle')
    expect(excerpt.startsWith('needle')).toBe(true)
  })
})

describe('searchMatchSegments', () => {
  it('marks every run that matches a word of the query, whatever its case', () => {
    expect(searchMatchSegments('Log in to LOGIN.ts', 'login to')).toEqual([
      { text: 'Log in ', match: false },
      { text: 'to', match: true },
      { text: ' ', match: false },
      { text: 'LOGIN', match: true },
      { text: '.ts', match: false },
    ])
  })

  it('merges words that overlap', () => {
    expect(searchMatchSegments('abcdef', 'abc cde')).toEqual([
      { text: 'abcde', match: true },
      { text: 'f', match: false },
    ])
  })

  it('leaves text with no match, or a query of no words, as one run', () => {
    expect(searchMatchSegments('plain', 'zzz')).toEqual([{ text: 'plain', match: false }])
    expect(searchMatchSegments('plain', '  ')).toEqual([{ text: 'plain', match: false }])
    expect(searchMatchSegments('', 'a')).toEqual([])
  })
})

describe('stepSearchCursor', () => {
  it('moves through the rows and wraps at either end', () => {
    expect(stepSearchCursor(0, 3, 1)).toBe(1)
    expect(stepSearchCursor(2, 3, 1)).toBe(0)
    expect(stepSearchCursor(0, 3, -1)).toBe(2)
  })

  it('starts at the first row going down and the last going up', () => {
    expect(stepSearchCursor(-1, 3, 1)).toBe(0)
    expect(stepSearchCursor(-1, 3, -1)).toBe(2)
    expect(stepSearchCursor(7, 3, 1)).toBe(0)
  })

  it('has nowhere to go without rows', () => {
    expect(stepSearchCursor(0, 0, 1)).toBe(-1)
  })
})

describe('isSearchableQuery', () => {
  it('needs at least two characters besides spaces', () => {
    expect(isSearchableQuery(' a ')).toBe(false)
    expect(isSearchableQuery('ab')).toBe(true)
  })
})

describe('projectSearchSummary', () => {
  it('counts the results', () => {
    const groups = projectSearchGroups([{ path: 'a' }, { record: note, reference: '&n1' }], 'qa')
    expect(projectSearchSummary(groups, 'qa')).toBe('2 results for “qa”')
    expect(projectSearchSummary(groups.slice(1), 'qa')).toBe('1 result for “qa”')
  })

  it('says when nothing matched', () => {
    expect(projectSearchSummary([], ' qa ')).toBe('Nothing in this project matches “qa”.')
  })
})

describe('projectSearchStatus', () => {
  it('is idle with nothing typed and short with too little', () => {
    expect(projectSearchStatus('  ', undefined)).toBe('idle')
    expect(projectSearchStatus('a', { query: 'ab', failed: false })).toBe('short')
  })

  it('is searching until the search answers what is typed', () => {
    expect(projectSearchStatus('ab', undefined)).toBe('searching')
    expect(projectSearchStatus('abc', { query: 'ab', failed: false })).toBe('searching')
    expect(projectSearchStatus('abc', { query: 'ab', failed: true })).toBe('searching')
  })

  it('is done or failed once it has, spaces around the query aside', () => {
    expect(projectSearchStatus(' ab ', { query: 'ab', failed: false })).toBe('done')
    expect(projectSearchStatus('ab', { query: 'ab', failed: true })).toBe('error')
  })
})

describe('searchRecordChip', () => {
  const [storyRow] = projectSearchGroups([{ record: story, reference: '#s1' }], 'login')[0]
    .rows as ProjectSearchRecordRow[]
  const [noteRow] = projectSearchGroups([{ record: note, reference: '&n1' }], 'qa')[0]
    .rows as ProjectSearchRecordRow[]

  it('shows the chip as described, with the title beside a chip that does not name it', () => {
    const described = { kind: 'story' as const, label: '#3', detail: 'Login', link: storyRow.link }
    expect(searchRecordChip(storyRow, described)).toEqual({
      description: described,
      title: 'Login',
    })
  })

  it('leaves the title out when the chip already names it', () => {
    const described = { kind: 'note' as const, label: 'QA login', link: noteRow.link }
    expect(searchRecordChip(noteRow, described)).toEqual({ description: described })
  })

  it('names the record by its title while its chip cannot be described', () => {
    const fallback = { description: { kind: 'story', label: 'Login', link: storyRow.link } }
    expect(searchRecordChip(storyRow, undefined)).toEqual(fallback)
    expect(searchRecordChip(storyRow, { kind: 'story', label: '#?', missing: true })).toEqual(
      fallback,
    )
  })
})
