import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AppNote } from '../utils/appNotesTypes'
import { useAppNotes } from './useAppNotes'

const held: AppNote = {
  id: 'app-note-1',
  projectId: 'p1',
  comment: 'Already there',
  targets: [{ kind: 'area', rect: { x: 0, y: 0, width: 8, height: 8, space: 'app-viewport' } }],
}

describe('useAppNotes', () => {
  it('skips an id already on the composer when a pick is added', () => {
    const { result } = renderHook(() => useAppNotes())
    act(() => result.current.onChangeAppNotes([held]))
    act(() =>
      result.current.addPick('p1', { selector: '#save', outerHtml: '<button>Save</button>' }),
    )
    expect(result.current.appNotes.map((note) => note.id)).toEqual(['app-note-1', 'app-note-2'])
    expect(result.current.appNotes[0]).toEqual(held)
  })
})
