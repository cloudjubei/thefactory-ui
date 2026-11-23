// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const scheme = vi.hoisted(() => ({ value: 'light' as 'light' | 'dark' }))
vi.mock('react-native', () => vi.importActual('react-native-web'))
vi.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: scheme.value }) }))
vi.mock('react-native-svg', () => ({
  default: 'svg',
  Circle: 'circle',
  Line: 'line',
  Path: 'path',
  Polygon: 'polygon',
  Polyline: 'polyline',
  Rect: 'rect',
}))

import FileMergeDialog from '../../src/native/compound/files/FileMergeDialog'
import { OverlayProvider } from '../../src/native/primitives/Overlay'
import { nativeDarkTheme, nativeLightTheme } from '../../src/tokens/native'
import { incomingFileDraft } from '../scenes/filePaneIncomingFixture'
import { FILE_PANE_INCOMING_VIEW } from './filePaneIncomingView'

afterEach(() => {
  scheme.value = 'light'
  cleanup()
})

describe('native FileMergeDialog and incoming callout view', () => {
  it('opens Review and merge from the callout, resolves the hunk, and updates the draft', async () => {
    render(
      <OverlayProvider>
        {FILE_PANE_INCOMING_VIEW.render(new URLSearchParams({ state: 'callout' }))}
      </OverlayProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Incoming edits overlap your changes' }))
    fireEvent.click(await screen.findByText('Review and merge'))

    expect(await screen.findByText('1 remaining')).toBeTruthy()
    fireEvent.click(screen.getByText('Accept both'))
    expect(screen.getByText('No conflicts remaining')).toBeTruthy()

    fireEvent.click(screen.getByText('Apply merge'))

    const editor = screen.getByLabelText('File contents') as HTMLTextAreaElement
    await waitFor(() =>
      expect(editor.value).toBe(
        'Release notes\n\nDraft: add an example for the new settings panel.\nDocument the updated settings panel.\n\nAvailable next Monday.',
      ),
    )
    expect(screen.queryByRole('button', { name: 'Incoming edits overlap your changes' })).toBeNull()
  })

  it.each([
    ['light', nativeLightTheme],
    ['dark', nativeDarkTheme],
  ] as const)(
    'applies %s theme styles, stretches the modal body, and resolves multi-hunk conflicts',
    async (mode, theme) => {
      scheme.value = mode
      const onApply = vi.fn()
      const onClose = vi.fn()
      const base = 'alpha\nbeta\ngamma\ndelta\n'
      const { rerender, baseElement } = render(
        <OverlayProvider>
          <FileMergeDialog
            input={{
              path: 'src/config.ts',
              base,
              ours: 'ALPHA_LOCAL\nbeta\ngamma\nDELTA_LOCAL\n',
              theirs: 'ALPHA_REMOTE\nbeta\ngamma\nDELTA_REMOTE\n',
            }}
            onClose={onClose}
            onApply={onApply}
            save
          />
        </OverlayProvider>,
      )

      const pathLabel = await screen.findByText('src/config.ts')
      const probe = document.createElement('div')
      probe.style.color = theme.text.secondary
      expect((pathLabel as HTMLElement).style.color).toBe(probe.style.color)
      expect(baseElement.innerHTML).not.toContain('var(--')

      const cancelText = screen.getByText('Cancel')
      const cancelButton = cancelText.closest('[role="button"]') as HTMLElement
      const footerRow = cancelButton.parentElement as HTMLElement
      expect(getComputedStyle(footerRow).flexDirection).toBe('row')
      const modalBody = footerRow.parentElement?.previousElementSibling as HTMLElement
      expect(getComputedStyle(modalBody).flexGrow).toBe('1')
      expect(getComputedStyle(modalBody).minHeight).toBe('0px')

      expect(screen.getByText('2 remaining')).toBeTruthy()
      expect(screen.getAllByText('Accept ours')).toHaveLength(2)
      expect(screen.getAllByText('Accept theirs')).toHaveLength(2)
      expect(screen.getAllByText('Accept both')).toHaveLength(2)

      fireEvent.click(screen.getByText('Accept theirs (all)'))
      expect(screen.getByText('No conflicts remaining')).toBeTruthy()

      fireEvent.click(screen.getByText('Merge and save'))
      expect(onApply).toHaveBeenCalledExactlyOnceWith('ALPHA_REMOTE\nbeta\ngamma\nDELTA_REMOTE\n')

      rerender(
        <OverlayProvider>
          <FileMergeDialog
            input={{
              path: 'src/config.ts',
              base,
              ours: 'alpha\nBETA_LOCAL\ngamma\ndelta\n',
              theirs: 'alpha\nBETA_REMOTE\ngamma\ndelta\n',
            }}
            onClose={onClose}
            onApply={onApply}
            save
          />
        </OverlayProvider>,
      )
      expect(screen.getByText('1 remaining')).toBeTruthy()
      expect(screen.queryByText('Accept theirs (all)')).toBeNull()
    },
  )

  it('shows deleted and renamed callout actions on native and settles Recreate on save or Discard mine', async () => {
    const { baseElement, unmount } = render(
      <OverlayProvider>
        {FILE_PANE_INCOMING_VIEW.render(new URLSearchParams({ state: 'renamed' }))}
      </OverlayProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'File deleted remotely' }))
    expect(await screen.findByText('File renamed or moved remotely')).toBeTruthy()
    expect(
      screen.getByText(
        'Moved to docs/archive/release-notes.txt. Treated as a delete here and a new file at the new path.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Source: A person')).toBeTruthy()
    expect(baseElement.innerHTML).not.toContain('var(--')

    fireEvent.click(screen.getByText('Recreate on save'))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'File deleted remotely' })).toBeNull(),
    )
    expect((screen.getByLabelText('File contents') as HTMLTextAreaElement).value).toContain(
      'Draft: add an example',
    )
    unmount()

    render(
      <OverlayProvider>
        {FILE_PANE_INCOMING_VIEW.render(new URLSearchParams({ state: 'deleted' }))}
      </OverlayProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'File deleted remotely' }))
    expect(await screen.findByText('File deleted remotely')).toBeTruthy()
    fireEvent.click(screen.getByText('Discard mine'))
    expect(await screen.findByText('Select a file to view its contents.')).toBeTruthy()
  })

  it('opens a clean rename callout, Save opens merge, and the actions clear the warning', async () => {
    const { unmount } = render(
      <OverlayProvider>
        {FILE_PANE_INCOMING_VIEW.render(new URLSearchParams({ state: 'rename-clean' }))}
      </OverlayProvider>,
    )

    expect(
      await screen.findByText('0 conflicts with your edits. Moved to docs/notes.txt.'),
    ).toBeTruthy()
    expect(screen.getByText('Source: A person')).toBeTruthy()
    expect((screen.getByLabelText('File contents') as HTMLTextAreaElement).value).toContain(
      'Draft: add an example',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('No conflicts remaining')).toBeTruthy()
    expect(screen.getByText('Merge and save')).toBeTruthy()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('No conflicts remaining')).toBeNull()
    unmount()

    const kept = render(
      <OverlayProvider>
        {FILE_PANE_INCOMING_VIEW.render(new URLSearchParams({ state: 'rename-clean' }))}
      </OverlayProvider>,
    )
    fireEvent.click(await screen.findByText('Keep mine'))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Incoming edits can merge cleanly' })).toBeNull(),
    )
    expect((screen.getByLabelText('File contents') as HTMLTextAreaElement).value).toContain(
      'Draft: add an example',
    )
    kept.unmount()

    render(
      <OverlayProvider>
        {FILE_PANE_INCOMING_VIEW.render(new URLSearchParams({ state: 'rename-clean' }))}
      </OverlayProvider>,
    )
    fireEvent.click(await screen.findByText('Take remote'))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Incoming edits can merge cleanly' })).toBeNull(),
    )
    expect((screen.getByLabelText('File contents') as HTMLTextAreaElement).value).toBe(
      'Release notes\n\nDocument the settings panel.\n\nAvailable next Monday.',
    )
  })

  it('shows no warning icon when a rename read returned the same bytes', () => {
    render(
      <OverlayProvider>
        {FILE_PANE_INCOMING_VIEW.render(new URLSearchParams({ state: 'rename-same' }))}
      </OverlayProvider>,
    )
    expect(screen.queryByRole('button', { name: 'Incoming edits can merge cleanly' })).toBeNull()
    expect(screen.queryByRole('image', { name: 'Incoming edits can merge cleanly' })).toBeNull()
    const editor = screen.getByLabelText('File contents') as HTMLTextAreaElement
    expect(editor.value).toBe(incomingFileDraft)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.queryByText('Review and merge')).toBeNull()
    expect(editor.value).toBe(incomingFileDraft)
  })

  it('offers Load latest remote inside the single native merge modal when stale', async () => {
    const onReload = vi.fn()
    const { baseElement } = render(
      <OverlayProvider>
        <FileMergeDialog
          input={{
            path: 'src/config.ts',
            base: 'a\n',
            ours: 'A\n',
            theirs: 'a\n',
          }}
          onClose={() => undefined}
          onApply={() => undefined}
          stale
          onReload={onReload}
          save
        />
      </OverlayProvider>,
    )

    expect(
      await screen.findByText(
        'The file changed during review. Load the latest remote head to merge against.',
      ),
    ).toBeTruthy()
    expect(baseElement.innerHTML).not.toContain('var(--')
    fireEvent.click(screen.getByText('Load latest remote'))
    expect(onReload).toHaveBeenCalledOnce()
  })
})
