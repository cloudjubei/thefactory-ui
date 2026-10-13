import { describe, expect, it } from 'vitest'
import {
  branchPickerItems,
  chatPickerItems,
  featurePickerItems,
  filePickerItems,
  filterPickerItems,
  processPickerItems,
  projectPickerItems,
  storyPickerItems,
  unmatchedOptions,
  withAgentPicks,
} from './questionPicker'
import { QUESTION_BRANCH_DETAIL } from './agentQuestionConstants'
import type { QuestionPickerItem } from './agentQuestionTypes'

const item = (id: string, over: Partial<QuestionPickerItem> = {}): QuestionPickerItem => ({
  id,
  label: id,
  answer: id,
  ...over,
})

describe('branchPickerItems', () => {
  it('lists each branch by name, answering with the name', () => {
    expect(branchPickerItems([{ name: 'feat/a', isLocal: true }])).toEqual([
      { id: 'feat/a', label: 'feat/a', answer: 'feat/a' },
    ])
  })

  it('says which branch is checked out, and tags it', () => {
    expect(branchPickerItems([{ name: 'dev', current: true, isLocal: true }])).toEqual([
      {
        id: 'dev',
        label: 'dev',
        answer: 'dev',
        detail: QUESTION_BRANCH_DETAIL.current,
        tag: 'current',
      },
    ])
  })

  it('says which is the default, and which lives only on the remote', () => {
    const items = branchPickerItems([
      { name: 'main', isDefault: true, isLocal: true },
      { name: 'origin-only', isLocal: false },
    ])
    expect(items.map((i) => i.detail)).toEqual([
      QUESTION_BRANCH_DETAIL.default,
      QUESTION_BRANCH_DETAIL.remoteOnly,
    ])
  })

  it('leaves out a nameless entry and a repeated name', () => {
    expect(
      branchPickerItems([{ name: '' }, { name: 'a', isLocal: true }, { name: 'a', isLocal: true }]),
    ).toHaveLength(1)
  })
})

describe('filePickerItems', () => {
  it('lists a file by its name, with its folder, answering with an @ reference', () => {
    expect(filePickerItems(['src/a/b.ts'])).toEqual([
      { id: 'src/a/b.ts', label: 'b.ts', detail: 'src/a', answer: '@src/a/b.ts' },
    ])
  })

  it('gives a file at the root no folder line', () => {
    expect(filePickerItems(['README.md'])).toEqual([
      { id: 'README.md', label: 'README.md', answer: '@README.md' },
    ])
  })
})

describe('storyPickerItems', () => {
  it('lists a story by title with its number and status, answering with its reference', () => {
    expect(
      storyPickerItems([{ id: 's1', title: 'Stash safety', status: 'pending', index: 9 }]),
    ).toEqual([{ id: 's1', label: 'Stash safety', detail: '#9', tag: 'pending', answer: '#s1' }])
  })

  it('falls back to the id for a story with no title or number', () => {
    expect(storyPickerItems([{ id: 's2' }])).toEqual([{ id: 's2', label: 's2', answer: '#s2' }])
  })
})

describe('featurePickerItems', () => {
  it('lists every feature under its story, answering with story.feature', () => {
    expect(
      featurePickerItems([
        {
          id: 's1',
          title: 'Bridge',
          index: 4,
          features: [
            { id: 'f1', title: 'Handlers', status: 'done', index: 2 },
            { id: 'f2', title: '' },
          ],
        },
        { id: 's2', title: 'Empty' },
      ]),
    ).toEqual([
      { id: 's1.f1', label: 'Handlers', detail: '#4.2 · Bridge', tag: 'done', answer: '#s1.f1' },
      { id: 's1.f2', label: 'f2', detail: 'Bridge', answer: '#s1.f2' },
    ])
  })
})

describe('projectPickerItems / chatPickerItems / processPickerItems', () => {
  it('answers a project with its title and id', () => {
    expect(projectPickerItems([{ id: 'p1', title: 'Backend' }])).toEqual([
      { id: 'p1', label: 'Backend', answer: 'Backend (project p1)' },
    ])
  })

  it('answers a chat with its title and key', () => {
    expect(chatPickerItems([{ key: 'k1', title: 'Backend Chat', detail: 'Project chat' }])).toEqual(
      [
        {
          id: 'k1',
          label: 'Backend Chat',
          detail: 'Project chat',
          answer: 'Backend Chat (chat k1)',
        },
      ],
    )
  })

  it('answers a process with its name and id', () => {
    expect(
      processPickerItems([{ id: 'pr', name: 'Story delivery', description: 'Build it' }]),
    ).toEqual([
      {
        id: 'pr',
        label: 'Story delivery',
        detail: 'Build it',
        answer: 'Story delivery (process pr)',
      },
    ])
  })
})

describe('withAgentPicks', () => {
  const items = [item('a'), item('b'), item('c', { answer: '@src/c.ts', label: 'c.ts' })]

  it('puts the agent’s pick first and marks it', () => {
    expect(withAgentPicks(items, [{ label: 'b', recommended: true }]).map((i) => i.id)).toEqual([
      'b',
      'a',
      'c',
    ])
    expect(withAgentPicks(items, [{ label: 'b', recommended: true }])[0]?.recommended).toBe(true)
  })

  it('puts the other items the agent named next, in its order', () => {
    expect(withAgentPicks(items, [{ label: 'c' }, { label: 'b' }]).map((i) => i.id)).toEqual([
      'c',
      'b',
      'a',
    ])
  })

  it('matches an option written as a reference or a path', () => {
    expect(withAgentPicks(items, [{ label: 'src/c.ts', recommended: true }])[0]?.id).toBe('c')
  })

  it('keeps the order when the agent named nothing in the list', () => {
    expect(withAgentPicks(items, [{ label: 'zzz' }]).map((i) => i.id)).toEqual(['a', 'b', 'c'])
    expect(withAgentPicks(items, undefined).map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('filterPickerItems', () => {
  const items = [
    item('alpha', { detail: 'first' }),
    item('beta', { detail: 'Second' }),
    item('gamma'),
  ]

  it('keeps everything, up to the limit, for an empty filter', () => {
    expect(filterPickerItems(items, '  ', 2).map((i) => i.id)).toEqual(['alpha', 'beta'])
  })

  it('matches the label, the detail or the answer, ignoring case', () => {
    expect(filterPickerItems(items, 'SECOND', 10).map((i) => i.id)).toEqual(['beta'])
    expect(filterPickerItems(items, 'amm', 10).map((i) => i.id)).toEqual(['gamma'])
  })

  it('keeps the selected item listed even past the limit', () => {
    expect(filterPickerItems(items, '', 1, 'gamma').map((i) => i.id)).toEqual(['alpha', 'gamma'])
  })
})

describe('unmatchedOptions', () => {
  const items = [item('dev'), item('main')]

  it('keeps the options no listed item stands for, so they stay one click away', () => {
    expect(
      unmatchedOptions(items, [{ label: 'dev' }, { label: 'A new branch', recommended: true }]),
    ).toEqual([{ label: 'A new branch', recommended: true }])
  })

  it('is empty when every option is in the list, or there are none', () => {
    expect(unmatchedOptions(items, [{ label: '#main' }])).toEqual([])
    expect(unmatchedOptions(items, undefined)).toEqual([])
  })
})
