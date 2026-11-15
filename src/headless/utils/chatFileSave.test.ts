import { describe, expect, it } from 'vitest'
import {
  chatFileSaveIsRepeat,
  chatFileSaveKey,
  chatFileSaveShownAsSaved,
  defaultSaveDestination,
  normalizeSaveDestination,
} from './chatFileSave'

describe('defaultSaveDestination', () => {
  it('names a stored attachment by its own name, at the root', () => {
    expect(defaultSaveDestination('.factory/attachments/chat-1/0123456789ab-battle map.png')).toBe(
      'battle map.png',
    )
  })

  it('keeps a file outside the store as it is named', () => {
    expect(defaultSaveDestination('out/0123456789ab-plan.md')).toBe('0123456789ab-plan.md')
    expect(defaultSaveDestination('notes.md')).toBe('notes.md')
  })
})

describe('normalizeSaveDestination', () => {
  it('makes what was typed project-relative', () => {
    expect(normalizeSaveDestination('  ./art/map.png ')).toBe('art/map.png')
    expect(normalizeSaveDestination('/art/map.png')).toBe('art/map.png')
    expect(normalizeSaveDestination('art\\maps\\map.png')).toBe('art/maps/map.png')
    expect(normalizeSaveDestination('   ')).toBe('')
  })
})

describe('chatFileSaveKey', () => {
  it('tells the same file in two projects apart', () => {
    expect(chatFileSaveKey('p1', 'a.png')).not.toBe(chatFileSaveKey('p2', 'a.png'))
    expect(chatFileSaveKey('p1', 'a.png')).toBe(chatFileSaveKey('p1', 'a.png'))
  })
})

describe('chatFileSaveShownAsSaved', () => {
  it('reads as saved while under way and once done, not otherwise', () => {
    expect(chatFileSaveShownAsSaved({ status: 'saving', destination: 'a' })).toBe(true)
    expect(chatFileSaveShownAsSaved({ status: 'saved', destination: 'a' })).toBe(true)
    expect(chatFileSaveShownAsSaved({ status: 'idle' })).toBe(false)
    expect(
      chatFileSaveShownAsSaved({ status: 'failed', destination: 'a', error: 'x', exists: true }),
    ).toBe(false)
  })
})

describe('chatFileSaveIsRepeat', () => {
  it('refuses any press while one is under way', () => {
    const state = { status: 'saving' as const, destination: 'a.png' }
    expect(chatFileSaveIsRepeat(state, 'a.png', false)).toBe(true)
    expect(chatFileSaveIsRepeat(state, 'b.png', true)).toBe(true)
  })

  it('refuses the same save again, but lets a new place or a replace through', () => {
    const state = { status: 'saved' as const, destination: 'a.png' }
    expect(chatFileSaveIsRepeat(state, 'a.png', false)).toBe(true)
    expect(chatFileSaveIsRepeat(state, 'b.png', false)).toBe(false)
    expect(chatFileSaveIsRepeat(state, 'a.png', true)).toBe(false)
  })

  it('lets a first save or a retry through', () => {
    expect(chatFileSaveIsRepeat({ status: 'idle' }, 'a.png', false)).toBe(false)
    expect(
      chatFileSaveIsRepeat(
        { status: 'failed', destination: 'a.png', error: 'x', exists: true },
        'a.png',
        false,
      ),
    ).toBe(false)
  })
})
