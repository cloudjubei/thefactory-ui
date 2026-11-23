// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { incomingFileDraft, incomingRenameCleanRemote } from './filePaneIncomingFixture'
import { FILE_PANE_INCOMING_SCENES } from './filePaneIncoming'

afterEach(() => {
  cleanup()
})

function renderState(id: string) {
  const scene = FILE_PANE_INCOMING_SCENES.find((item) => item.id === 'file-pane-incoming')
  const state = scene?.states.find((item) => item.id === id)
  if (!state) throw new Error(`file-pane-incoming has no state ${id}`)
  return render(<>{state.render()}</>)
}

describe('file-pane-incoming rename read states', () => {
  it('keeps the existing state urls and adds rename-clean and rename-same', () => {
    const scene = FILE_PANE_INCOMING_SCENES.find((item) => item.id === 'file-pane-incoming')
    expect(scene?.states.map((state) => state.id)).toEqual([
      'clean',
      'conflict',
      'deleted',
      'renamed',
      'none',
      'callout',
      'rename-clean',
      'rename-same',
    ])
  })

  it('opens a clean callout that names the move and the person', async () => {
    renderState('rename-clean')
    expect(
      await screen.findByText('0 conflicts with your edits. Moved to docs/notes.txt.'),
    ).toBeTruthy()
    expect(screen.getByText('Source: A person')).toBeTruthy()
    expect(screen.getByText('1 hunk changed remotely')).toBeTruthy()
    expect((screen.getByLabelText('File contents') as HTMLTextAreaElement).value).toBe(
      incomingFileDraft,
    )
  })

  it('opens the merge dialog from Save', async () => {
    renderState('rename-clean')
    await screen.findByText('0 conflicts with your edits. Moved to docs/notes.txt.')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('dialog', { name: 'Review and merge' })).toBeTruthy()
    expect(screen.getByText('No conflicts remaining')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Merge and save' })).toBeTruthy()
  })

  it('clears the warning and keeps the draft on Keep mine', async () => {
    renderState('rename-clean')
    await screen.findByText('0 conflicts with your edits. Moved to docs/notes.txt.')
    fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }))
    expect(screen.queryByRole('button', { name: 'Incoming edits can merge cleanly' })).toBeNull()
    expect((screen.getByLabelText('File contents') as HTMLTextAreaElement).value).toBe(
      incomingFileDraft,
    )
  })

  it('clears the warning and shows the remote text on Take remote', async () => {
    renderState('rename-clean')
    await screen.findByText('0 conflicts with your edits. Moved to docs/notes.txt.')
    fireEvent.click(screen.getByRole('button', { name: 'Take remote' }))
    expect(screen.queryByRole('button', { name: 'Incoming edits can merge cleanly' })).toBeNull()
    expect((screen.getByLabelText('File contents') as HTMLTextAreaElement).value).toBe(
      incomingRenameCleanRemote,
    )
  })

  it('shows the same draft and no warning when the rename read returned the same bytes', () => {
    renderState('rename-same')
    expect(screen.queryByRole('button', { name: 'Incoming edits can merge cleanly' })).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
    const editor = screen.getByLabelText('File contents') as HTMLTextAreaElement
    expect(editor.value).toBe(incomingFileDraft)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(editor.value).toBe(incomingFileDraft)
  })
})
