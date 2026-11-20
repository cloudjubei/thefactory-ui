import type { ReactNode } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AppElementPick, AppNoteComposerProps } from '../../../headless/utils/appNotesTypes'

const fixture = vi.hoisted(() => ({
  composer: {} as AppNoteComposerProps,
  pick: undefined as ((pick: AppElementPick) => void) | undefined,
}))
vi.mock('thefactory-ui/web', () => ({
  ChatInput: (props: AppNoteComposerProps) => {
    fixture.composer = props
    return null
  },
  ProjectAppView: (props: { onElementPick?: (pick: AppElementPick) => void }) => {
    fixture.pick = props.onElementPick
    return null
  },
}))
vi.mock('../../../native/compound/chat/ChatInput', () => ({
  default: (props: AppNoteComposerProps) => {
    fixture.composer = props
    return null
  },
}))
vi.mock('../../../native/compound/ProjectAppView', () => ({
  default: (props: { onElementPick?: (pick: AppElementPick) => void }) => {
    fixture.pick = props.onElementPick
    return null
  },
}))
vi.mock('react-native', () => ({
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  Pressable: () => null,
}))
vi.mock('../../../../playground/native/stubs/webview', () => ({
  WebViewFixture: { Provider: ({ children }: { children?: ReactNode }) => children },
}))

afterEach(cleanup)
Object.defineProperties(URL, {
  createObjectURL: { configurable: true, value: () => 'blob:fixture' },
  revokeObjectURL: { configurable: true, value: () => {} },
})

// Load playground fixtures through Vitest so source-only tsc does not pull the whole
// playground (with its separate package aliases) into the library compilation.
const { APP_NOTE_SCENES } = await vi.importActual<{
  APP_NOTE_SCENES: { states: { render: () => ReactNode }[] }[]
}>('../../../../playground/scenes/appNotes')
const { APP_NOTE_VIEWS } = await vi.importActual<{
  APP_NOTE_VIEWS: { id: string; render: (address: URLSearchParams) => ReactNode }[]
}>('../../../../playground/native/appNotesViews')
const pick = { selector: '#renewal', outerHtml: '<p id="renewal">Renewal</p>' }

describe('app note comparison fixtures', () => {
  for (const [name, scene] of [
    ['web', () => APP_NOTE_SCENES[0].states[0].render()],
    [
      'native',
      () => APP_NOTE_VIEWS.find((view) => view.id === 'app-picker')!.render(new URLSearchParams()),
    ],
  ] as const) {
    it(`${name} keeps IDs unique after removing an earlier pick and picking again`, () => {
      render(scene())
      act(() => fixture.pick!(pick))
      act(() => fixture.pick!(pick))
      const retained = fixture.composer.appNotes![1]
      expect(retained).toMatchObject({
        projectId: 'sample',
        comment: '',
        targets: [{ kind: 'element', ...pick }],
      })
      act(() => fixture.composer.onChangeAppNotes!([retained]))
      act(() => fixture.pick!(pick))
      const notes = fixture.composer.appNotes!
      expect(notes[0]).toBe(retained)
      expect(new Set(notes.map((note) => note.id)).size).toBe(2)
      // Editing/removing the new entry must not also target the retained entry.
      act(() => fixture.composer.onChangeAppNotes!(notes.filter((note) => note.id !== notes[1].id)))
      expect(fixture.composer.appNotes).toEqual([retained])
    })
  }
})
