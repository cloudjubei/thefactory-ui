import type { ReactNode } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  AppSelectionComposerProps,
  AppElementPick,
} from '../../../headless/utils/appSelections'

const fixture = vi.hoisted(() => ({
  composer: {} as AppSelectionComposerProps,
  pick: undefined as ((pick: AppElementPick) => void) | undefined,
}))
vi.mock('thefactory-ui/web', () => ({
  ChatInput: (props: AppSelectionComposerProps) => {
    fixture.composer = props
    return null
  },
  ProjectAppView: (props: { onElementPick?: (pick: AppElementPick) => void }) => {
    fixture.pick = props.onElementPick
    return null
  },
}))
vi.mock('../../../native/compound/chat/ChatInput', () => ({
  default: (props: AppSelectionComposerProps) => {
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
const { APP_SELECTION_SCENES } = await vi.importActual<{
  APP_SELECTION_SCENES: { states: { render: () => ReactNode }[] }[]
}>('../../../../playground/scenes/appSelections')
const { APP_SELECTION_VIEWS } = await vi.importActual<{
  APP_SELECTION_VIEWS: { id: string; render: (address: URLSearchParams) => ReactNode }[]
}>('../../../../playground/native/appSelectionsViews')
const pick = { selector: '#renewal', outerHtml: '<p id="renewal">Renewal</p>' }

describe('app selection comparison fixtures', () => {
  for (const [name, scene] of [
    ['web', () => APP_SELECTION_SCENES[0].states[0].render()],
    [
      'native',
      () =>
        APP_SELECTION_VIEWS.find((view) => view.id === 'app-picker')!.render(new URLSearchParams()),
    ],
  ] as const) {
    it(`${name} keeps IDs unique after removing an earlier pick and picking again`, () => {
      render(scene())
      act(() => fixture.pick!(pick))
      act(() => fixture.pick!(pick))
      const retained = fixture.composer.appSelections![1]
      act(() => fixture.composer.onChangeAppSelections!([retained]))
      act(() => fixture.pick!(pick))
      const selections = fixture.composer.appSelections!
      expect(selections[0]).toBe(retained)
      expect(new Set(selections.map((selection) => selection.id)).size).toBe(2)
      // Editing/removing the new entry must not also target the retained entry.
      act(() =>
        fixture.composer.onChangeAppSelections!(
          selections.filter((selection) => selection.id !== selections[1].id),
        ),
      )
      expect(fixture.composer.appSelections).toEqual([retained])
    })
  }
})
