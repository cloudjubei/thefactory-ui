import { describe, expect, it } from 'vitest'
import { nextLocalChangesSelection, type ChangesAreaKey } from './localChangesSelection'

const set = (...keys: ChangesAreaKey[]) => new Set<ChangesAreaKey>(keys)

describe('nextLocalChangesSelection', () => {
  it('advances to the next unstaged file when the selected one is fully staged', () => {
    // Before: unstaged ['a','b','c'], 'b' (index 1) selected. After staging 'b'
    // it leaves unstaged and joins staged.
    const next = nextLocalChangesSelection({
      prevSelection: set('unstaged:b.ts'),
      prevPrimary: { area: 'unstaged', path: 'b.ts', index: 1 },
      staged: ['b.ts'],
      unstaged: ['a.ts', 'c.ts'],
    })
    expect(next).toEqual(set('unstaged:c.ts'))
  })

  it('clamps to the new last file when the staged one was last in its area', () => {
    const next = nextLocalChangesSelection({
      prevSelection: set('unstaged:c.ts'),
      prevPrimary: { area: 'unstaged', path: 'c.ts', index: 2 },
      staged: ['c.ts'],
      unstaged: ['a.ts', 'b.ts'],
    })
    expect(next).toEqual(set('unstaged:b.ts'))
  })

  it('advances to the next staged file when the selected one is fully unstaged', () => {
    const next = nextLocalChangesSelection({
      prevSelection: set('staged:x.ts'),
      prevPrimary: { area: 'staged', path: 'x.ts', index: 0 },
      staged: ['y.ts'],
      unstaged: ['x.ts'],
    })
    expect(next).toEqual(set('staged:y.ts'))
  })

  it('keeps the selection when the file is only partially staged (still in its area)', () => {
    const next = nextLocalChangesSelection({
      prevSelection: set('unstaged:b.ts'),
      prevPrimary: { area: 'unstaged', path: 'b.ts', index: 1 },
      staged: ['b.ts'],
      unstaged: ['a.ts', 'b.ts', 'c.ts'],
    })
    expect(next).toEqual(set('unstaged:b.ts'))
  })

  it('falls back to the other area when the selected file emptied its area', () => {
    const next = nextLocalChangesSelection({
      prevSelection: set('unstaged:only.ts'),
      prevPrimary: { area: 'unstaged', path: 'only.ts', index: 0 },
      staged: ['only.ts'],
      unstaged: [],
    })
    expect(next).toEqual(set('staged:only.ts'))
  })

  it('advances within the area when the file disappears entirely (discard/commit)', () => {
    const next = nextLocalChangesSelection({
      prevSelection: set('unstaged:a.ts'),
      prevPrimary: { area: 'unstaged', path: 'a.ts', index: 0 },
      staged: [],
      unstaged: ['b.ts'],
    })
    expect(next).toEqual(set('unstaged:b.ts'))
  })

  it('keeps surviving multi-selection rows when only the primary leaves', () => {
    const next = nextLocalChangesSelection({
      prevSelection: set('unstaged:a.ts', 'unstaged:b.ts'),
      prevPrimary: { area: 'unstaged', path: 'a.ts', index: 0 },
      staged: ['a.ts'],
      unstaged: ['b.ts', 'c.ts'],
    })
    expect(next).toEqual(set('unstaged:b.ts'))
  })

  it('auto-selects the first staged row when nothing was selected', () => {
    const next = nextLocalChangesSelection({
      prevSelection: set(),
      prevPrimary: null,
      staged: ['s.ts'],
      unstaged: ['u.ts'],
    })
    expect(next).toEqual(set('staged:s.ts'))
  })

  it('auto-selects the first unstaged row when there are no staged files', () => {
    const next = nextLocalChangesSelection({
      prevSelection: set(),
      prevPrimary: null,
      staged: [],
      unstaged: ['u.ts'],
    })
    expect(next).toEqual(set('unstaged:u.ts'))
  })

  it('returns an empty selection when the working tree is clean', () => {
    const next = nextLocalChangesSelection({
      prevSelection: set('unstaged:gone.ts'),
      prevPrimary: { area: 'unstaged', path: 'gone.ts', index: 0 },
      staged: [],
      unstaged: [],
    })
    expect(next).toEqual(set())
  })

  it('treats paths containing colons as opaque keys', () => {
    const next = nextLocalChangesSelection({
      prevSelection: set('unstaged:weird:name.ts'),
      prevPrimary: { area: 'unstaged', path: 'weird:name.ts', index: 0 },
      staged: ['weird:name.ts'],
      unstaged: ['after.ts'],
    })
    expect(next).toEqual(set('unstaged:after.ts'))
  })
})
