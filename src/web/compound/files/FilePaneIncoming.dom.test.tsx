import { StrictMode, type ReactNode } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  canonicalReferences,
  referencesAsTyped,
  resolveTypedReference,
} from 'thefactory-tools/utils'
import type { ReferenceIndex } from 'thefactory-tools/types'
import { useFileMerge } from '../../../headless/hooks/useFileMerge'
import FilePane from './FilePane'
import { ToastProvider } from '../../primitives/Toast'
import { FilesProvider, useFiles } from '../../../headless/contexts/FilesContext'
import { ReferenceRenderingContext } from '../../../headless/contexts/ReferenceRenderingContext'

const storyIds = Array.from(
  { length: 12 },
  (_, i) => `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
)
const referenceRenderingFor = (ids: string[]) => {
  const index: ReferenceIndex = {
    projectId: 'project',
    projects: new Map([
      [
        'project',
        {
          projectId: 'project',
          notes: [],
          stories: ids.map((id) => ({ id, title: 'Story', features: [] })),
        },
      ],
    ]),
    attachments: [],
  }
  return {
    renderReference: () => undefined,
    references: {
      index,
      describe: () => undefined,
      describeLink: () => undefined,
      searchWork: () => [],
      searchHandles: () => [],
      searchFiles: undefined,
      describeFile: (path: string) => ({ path }),
      canonicalize: (text: string, before?: string) =>
        canonicalReferences(text, (typed) => resolveTypedReference(typed, index), before),
      asText: (text: string) => text,
      toTyped: (text: string) => referencesAsTyped(text, index),
    },
  }
}
const referenceRendering = referenceRenderingFor(storyIds)

const api = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  ws: { on: vi.fn() },
  listeners: new Set<(data: unknown) => void>(),
}))
vi.mock('../../../headless/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../headless/api')>()),
  readFile: api.read,
  writeFile: api.write,
  getAllFileStats: async () => ({ status: 200, data: [], headers: {} }),
}))
vi.mock('../../../headless/api/ApiContext', () => ({ useApi: () => ({ ws: api.ws }) }))
vi.mock('../../../headless/contexts/ProjectsContext', () => ({
  useActiveProject: () => ({ projectId: 'project' }),
}))

const path = 'notes.txt'
const base = 'one\ntwo\nthree\n'
const local = 'ONE\ntwo\nthree\n'
const cleanRemote = 'one\ntwo\nTHREE\n'
const toast = 'Incoming edits from remote'
const write = vi.fn(async () => {})
const review = vi.fn()

function Editor({
  openPath = path,
  overrideReview = false,
  connectedWrite = false,
}: {
  openPath?: string
  overrideReview?: boolean
  connectedWrite?: boolean
}) {
  const files = useFiles()
  return (
    <>
      <button onClick={() => files.selectFile(openPath)}>Open notes</button>
      <button onClick={() => files.selectFile('other.txt')}>Open other</button>
      <button onClick={() => void files.writeFile(path, local)}>Start write</button>
      <FilePane
        filePath={files.selectedPath}
        content={files.content}
        isContentLoading={files.isContentLoading}
        onWrite={
          connectedWrite ? async (path, text) => void (await files.writeFile(path, text)) : write
        }
        {...(overrideReview ? { onReviewFileChange: review } : {})}
      />
    </>
  )
}

function Providers({
  children,
  rendering = referenceRendering,
}: {
  children: ReactNode
  rendering?: typeof referenceRendering
}) {
  return (
    <StrictMode>
      <FilesProvider>
        <ToastProvider>
          <ReferenceRenderingContext.Provider value={rendering}>
            {children}
          </ReferenceRenderingContext.Provider>
        </ToastProvider>
      </FilesProvider>
    </StrictMode>
  )
}

function notifyEvent(data: Record<string, unknown>) {
  api.listeners.forEach((listener) => listener({ projectId: 'project', ...data }))
}

function notify(path: string, projectId = 'project', origin?: unknown) {
  api.listeners.forEach((listener) => listener({ projectId, paths: [path], origin }))
}

function emit(path: string, projectId = 'project', origin?: unknown) {
  return act(async () => notify(path, projectId, origin))
}

async function open(openPath = path, initial = base, overrideReview = false) {
  render(<Editor openPath={openPath} overrideReview={overrideReview} />, { wrapper: Providers })
  fireEvent.click(screen.getByText('Open notes'))
  const editor = (await screen.findByRole('textbox')) as HTMLTextAreaElement
  await waitFor(() => expect(editor.value).toBe(initial))
  return editor
}

beforeEach(() => {
  vi.clearAllMocks()
  api.read.mockReset()
  api.write.mockReset()
  api.read.mockResolvedValue({ data: { content: base } })
  api.ws.on.mockImplementation((event: string, listener: (data: unknown) => void) => {
    expect(event).toBe('files:changed')
    api.listeners.add(listener)
    return () => api.listeners.delete(listener)
  })
})

afterEach(cleanup)

it('refreshes clean editors in place for the selected path only', async () => {
  const editor = await open()
  api.read.mockClear().mockResolvedValue({ data: { content: cleanRemote } })
  await emit('elsewhere.txt')
  await emit(path, 'other-project')
  expect(api.read).not.toHaveBeenCalled()
  await emit(path)
  expect(screen.getByRole('textbox')).toBe(editor)
  expect(editor.value).toBe(cleanRemote)
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.queryByText(toast)).toBeNull()
})

it('keeps a focused dirty draft, shows the latest classification, and toasts only once', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  editor.focus()
  api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
  await emit(path)
  const triangle = screen.getByRole('img', { name: 'Incoming edits can merge cleanly' })
  const shape = triangle.querySelector('path')?.getAttribute('d')
  expect(triangle.querySelector('path')?.getAttribute('stroke')).toBe('var(--status-done-soft-fg)')
  expect(document.activeElement).toBe(editor)
  expect(screen.getByText(toast)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  await waitFor(() => expect(screen.queryByText(toast)).toBeNull())

  api.read.mockResolvedValueOnce({ data: { content: 'remote one\ntwo\nthree\n' } })
  await emit(path)
  expect(screen.getByRole('img', { name: 'Incoming edits overlap your changes' })).toBe(triangle)
  expect(triangle.querySelector('path')?.getAttribute('stroke')).toBe(
    'var(--status-review-soft-fg)',
  )

  api.read.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
  await emit(path)
  expect(screen.getByRole('img', { name: 'File deleted remotely' })).toBe(triangle)
  expect(triangle.querySelector('path')?.getAttribute('stroke')).toBe('var(--status-stuck-soft-fg)')
  expect(triangle.querySelector('path')?.getAttribute('d')).toBe(shape)
  expect(screen.getByRole('textbox')).toBe(editor)
  expect(editor.value).toBe(local)
  expect(screen.queryByText(toast)).toBeNull()
  expect(write).not.toHaveBeenCalled()

  fireEvent.click(screen.getByText('Open other'))
  await waitFor(() => expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(base))
  expect(screen.queryByRole('img')).toBeNull()
})

it.each([base, cleanRemote])(
  'holds Save until the announced disk version %j is checked',
  async (remote) => {
    const editor = await open()
    fireEvent.change(editor, { target: { value: local } })
    const save = screen.getByRole<HTMLButtonElement>('button', { name: 'Save' })
    let finishRead!: () => void
    api.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRead = () => resolve({ data: { content: remote } })
        }),
    )

    await act(async () => {
      notify(path)
      // Try Save before React has committed the event's state update.
      fireEvent.click(save)
      expect(write).not.toHaveBeenCalled()
    })
    expect(save.disabled).toBe(true)
    fireEvent.click(save)
    expect(write).not.toHaveBeenCalled()
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByText(toast)).toBeNull()

    await act(async () => finishRead())
    expect(editor.value).toBe(local)
    if (remote === base) {
      expect(save.disabled).toBe(false)
      expect(screen.queryByRole('img')).toBeNull()
      fireEvent.click(save)
      await waitFor(() => expect(write).toHaveBeenCalledExactlyOnceWith(path, local))
      await waitFor(() => expect(save.disabled).toBe(false))
    } else {
      expect(save.disabled).toBe(false)
      expect(screen.getByRole('img', { name: 'Incoming edits can merge cleanly' })).toBeTruthy()
      expect(screen.getByText(toast)).toBeTruthy()
      fireEvent.click(save)
      expect(screen.getByRole('dialog', { name: 'Review and merge' })).toBeTruthy()
      expect(write).not.toHaveBeenCalled()
    }
  },
)

it.each([base, cleanRemote])('retries a failed remote check for %j', async (remote) => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  const save = screen.getByRole<HTMLButtonElement>('button', { name: 'Save' })
  api.read.mockRejectedValueOnce(new Error('Network unavailable'))
  await emit(path)

  expect(screen.getByRole('alert').textContent).toContain('Could not check for remote edits')
  expect(editor.value).toBe(local)
  expect(save.disabled).toBe(true)
  fireEvent.click(save)
  expect(write).not.toHaveBeenCalled()
  expect(screen.queryByText(toast)).toBeNull()

  let finishRead!: () => void
  api.read.mockClear().mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishRead = () => resolve({ data: { content: remote } })
      }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Retry remote check' }))
  expect(api.read).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ body: { path } }))
  expect(screen.queryByRole('alert')).toBeNull()
  expect(save.disabled).toBe(true)
  await act(async () => finishRead())

  expect(screen.getByRole('textbox')).toBe(editor)
  expect(editor.value).toBe(local)
  expect(write).not.toHaveBeenCalled()
  if (remote === base) {
    expect(save.disabled).toBe(false)
    expect(screen.queryByRole('img')).toBeNull()
    await act(async () => fireEvent.click(save))
    expect(write).toHaveBeenCalledExactlyOnceWith(path, local)
  } else {
    expect(save.disabled).toBe(false)
    expect(screen.getByRole('img', { name: 'Incoming edits can merge cleanly' })).toBeTruthy()
    expect(screen.getByText(toast)).toBeTruthy()
  }
})

it('opens on hover, updates the callout from the latest event and delegates review without writing', async () => {
  const editor = await open(path, base, true)
  fireEvent.change(editor, { target: { value: local } })
  editor.focus()
  api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
  await emit(path, 'project', { kind: 'agent', runId: 'run-42' })
  const trigger = screen.getByRole('button', { name: 'Incoming edits can merge cleanly' })
  // jsdom does not provide PointerEvent; feed React the pointer type explicitly.
  const event = new MouseEvent('pointerover', { bubbles: true })
  Object.defineProperty(event, 'pointerType', { value: 'mouse' })
  fireEvent(trigger, event)
  await screen.findByRole('dialog', { name: '1 hunk changed remotely' })
  expect(document.activeElement).toBe(editor)
  expect(screen.getByText('0 conflicts with your edits')).toBeTruthy()
  expect(screen.getByText('Source: Agent run run-42')).toBeTruthy()
  const secondRemote = 'REMOTE\ntwo\nTHREE\n'
  api.read.mockResolvedValueOnce({ data: { content: secondRemote } })
  await emit(path, 'project', { kind: 'external' })
  expect(screen.getByRole('dialog', { name: '2 hunks changed remotely' })).toBeTruthy()
  expect(screen.getByText('1 conflict with your edits')).toBeTruthy()
  expect(screen.getByText('Source: External edit')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Review and merge' }))
  expect(review).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ remote: secondRemote }),
    local,
  )
  expect(editor.value).toBe(local)
  expect(write).not.toHaveBeenCalled()
})

it('names an agent chat on the callout when the file change says which chat', async () => {
  const editor = await open(path, base, true)
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
  await emit(path, 'project', { kind: 'agent', runId: 'run-42', chatContextId: 'chat-42' })
  fireEvent.click(screen.getByRole('button', { name: 'Incoming edits can merge cleanly' }))
  expect(screen.getByText('Source: Agent run run-42 · chat chat-42')).toBeTruthy()
})

it('updates the callout when the same bytes arrive from a different agent chat', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValue({ data: { content: cleanRemote } })
  await emit(path, 'project', { kind: 'agent', runId: 'run-42', chatContextId: 'chat-a' })
  fireEvent.click(screen.getByRole('button', { name: 'Incoming edits can merge cleanly' }))
  expect(screen.getByText('Source: Agent run run-42 · chat chat-a')).toBeTruthy()

  await emit(path, 'project', { kind: 'agent', runId: 'run-42', chatContextId: 'chat-b' })
  expect(screen.getByText('Source: Agent run run-42 · chat chat-b')).toBeTruthy()
  expect(screen.queryByText('Source: Agent run run-42 · chat chat-a')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Merge and save' }).disabled).toBe(
    false,
  )
  await emit(path, 'project', { kind: 'agent', runId: 'run-42', chatContextId: 'chat-b' })
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Merge and save' }).disabled).toBe(
    false,
  )
})

it('treats the same remote bytes from another chat as a different change', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValue({ data: { content: cleanRemote } })
  await emit(path, 'project', { kind: 'chat', chatContextId: 'chat-a' })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Merge and save' }).disabled).toBe(
    false,
  )

  await emit(path, 'project', { kind: 'chat', chatContextId: 'chat-a' })
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Merge and save' }).disabled).toBe(
    false,
  )

  await emit(path, 'project', { kind: 'chat', chatContextId: 'chat-b' })
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Merge and save' }).disabled).toBe(
    true,
  )
  expect(editor.value).toBe(local)
})

it.each(['Keep mine', 'Take remote'])(
  '%s settles the draft without writing the file',
  async (choice) => {
    const editor = await open()
    fireEvent.change(editor, { target: { value: local } })
    api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
    await emit(path, 'project', { kind: 'person' })
    const trigger = screen.getByRole('button', { name: 'Incoming edits can merge cleanly' })
    fireEvent.click(trigger)
    expect(screen.getByText('Source: A person')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: choice }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
    expect(write).not.toHaveBeenCalled()
    expect(editor.value).toBe(choice === 'Keep mine' ? local : cleanRemote)
    const save = screen.getByRole<HTMLButtonElement>('button', { name: 'Save' })
    expect(save.disabled).toBe(choice === 'Take remote')
    if (choice === 'Keep mine') {
      await act(async () => fireEvent.click(save))
      expect(write).toHaveBeenCalledExactlyOnceWith(path, local)
    }
  },
)

it.each([
  {
    name: 'retains an existing literal that the remote removed',
    original: 'PR #12\n\nOriginal\n',
    draft: 'PR #12\n\nLocal edit\n',
    remote: 'Remote intro\n\nOriginal\n',
    expected: 'PR #12\n\nLocal edit\n',
  },
  {
    name: 'retains a newly resolved reference even when the remote has identical typed text',
    original: 'Original\n',
    draft: 'PR #12\n',
    remote: 'PR #12\n',
    expected: `PR #${storyIds[11]}\n`,
  },
  {
    name: 'keeps literal references through further editing and resolves new references',
    original: 'PR #12\n\nOriginal\n',
    draft: 'PR #12\n\nLocal edit\n',
    remote: 'Remote intro\n\nOriginal\n',
    afterKeep: 'PR #12\n\nLocal edit\n\nSee #11\n',
    expected: `PR #12\n\nLocal edit\n\nSee #${storyIds[10]}\n`,
  },
])('Keep mine $name', async ({ original, draft, remote, afterKeep, expected }) => {
  const markdownPath = 'notes.md'
  api.read.mockResolvedValueOnce({ data: { content: original } })
  const editor = await open(markdownPath, original)
  fireEvent.change(editor, { target: { value: draft } })
  api.read.mockResolvedValueOnce({ data: { content: remote } })
  await emit(markdownPath)
  fireEvent.click(screen.getByRole('button', { name: /^Incoming edits/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }))

  expect(editor.value).toBe(draft)
  expect(write).not.toHaveBeenCalled()
  if (afterKeep) fireEvent.change(editor, { target: { value: afterKeep } })
  const save = screen.getByRole<HTMLButtonElement>('button', { name: 'Save' })
  expect(save.disabled).toBe(false)
  await act(async () => fireEvent.click(save))
  expect(write).toHaveBeenCalledExactlyOnceWith(markdownPath, expected)
})

it('keeps retained Markdown targets after the reference index reorders', async () => {
  const markdownPath = 'notes.md'
  api.read.mockResolvedValueOnce({ data: { content: 'Original\n' } })
  const view = (rendering = referenceRendering) => (
    <Providers rendering={rendering}>
      <Editor openPath={markdownPath} />
    </Providers>
  )
  const { rerender } = render(view())
  fireEvent.click(screen.getByText('Open notes'))
  const editor = await screen.findByRole<HTMLTextAreaElement>('textbox')
  await waitFor(() => expect(editor.value).toBe('Original\n'))
  const draft = 'See #1\n\nLocal prose\n'
  fireEvent.change(editor, { target: { value: draft } })
  api.read.mockResolvedValueOnce({ data: { content: 'Remote\n' } })
  await emit(markdownPath)
  fireEvent.click(screen.getByRole('button', { name: /^Incoming edits/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }))

  rerender(view(referenceRenderingFor([...storyIds].reverse())))
  expect(editor.value).toBe(draft)
  const intro = 'See #1\n\n'
  fireEvent.change(editor, {
    target: { value: intro + draft, selectionStart: intro.length, selectionEnd: intro.length },
  })
  fireEvent.change(editor, { target: { value: 'See #1\n\nSee #1\n\nEdited prose; also #1\n' } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })))
  expect(write).toHaveBeenCalledExactlyOnceWith(
    markdownPath,
    `See #${storyIds[11]}\n\nSee #${storyIds[0]}\n\nEdited prose; also #${storyIds[11]}\n`,
  )
})

it.each([
  { line: 'first', caret: 0, storyId: storyIds[11] },
  { line: 'last', caret: 'See #1\n'.length, storyId: storyIds[0] },
])(
  'saves the surviving Markdown target after deleting the $line duplicate line',
  async ({ caret, storyId }) => {
    const markdownPath = 'notes.md'
    api.read.mockResolvedValueOnce({ data: { content: 'Original\n' } })
    const view = (rendering = referenceRendering) => (
      <Providers rendering={rendering}>
        <Editor openPath={markdownPath} />
      </Providers>
    )
    const { rerender } = render(view())
    fireEvent.click(screen.getByText('Open notes'))
    const editor = await screen.findByRole<HTMLTextAreaElement>('textbox')
    await waitFor(() => expect(editor.value).toBe('Original\n'))
    const draft = 'See #1\n'
    fireEvent.change(editor, { target: { value: draft } })
    api.read.mockResolvedValueOnce({ data: { content: 'Remote\n' } })
    await emit(markdownPath)
    fireEvent.click(screen.getByRole('button', { name: /^Incoming edits/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }))
    rerender(view(referenceRenderingFor([...storyIds].reverse())))

    const duplicate = draft + draft
    fireEvent.change(editor, {
      target: {
        value: duplicate,
        selectionStart: duplicate.length,
        selectionEnd: duplicate.length,
      },
    })
    editor.setSelectionRange(caret, caret + draft.length)
    fireEvent.input(editor, {
      inputType: 'deleteContentBackward',
      target: { value: draft, selectionStart: caret, selectionEnd: caret },
    })
    expect(editor.value).toBe(draft)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })))
    expect(write).toHaveBeenCalledExactlyOnceWith(markdownPath, `See #${storyId}\n`)
  },
)

it('does not apply a discard action from a stale callout', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
  await emit(path)
  fireEvent.click(screen.getByRole('button', { name: 'Incoming edits can merge cleanly' }))
  expect(screen.queryByText(/Source:/)).toBeNull()
  const take = screen.getByRole('button', { name: 'Take remote' })
  api.read.mockResolvedValueOnce({ data: { content: 'REMOTE\ntwo\nthree\n' } })
  await act(async () => {
    notify(path)
    fireEvent.click(take)
  })
  expect(editor.value).toBe(local)
  expect(screen.getByRole('button', { name: 'Incoming edits overlap your changes' })).toBeTruthy()
  expect(write).not.toHaveBeenCalled()
})

it.each([
  ['Accept ours', 'ONE\ntwo\nTHREE\n'],
  ['Accept theirs', 'REMOTE\ntwo\nTHREE\n'],
  ['Accept both', 'ONE\nREMOTE\ntwo\nTHREE\n'],
])('reviews from the callout and applies %s without writing', async (choice, expected) => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValueOnce({ data: { content: 'REMOTE\ntwo\nTHREE\n' } })
  await emit(path)
  fireEvent.click(screen.getByRole('button', { name: 'Incoming edits overlap your changes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Review and merge' }))
  const apply = screen.getByRole<HTMLButtonElement>('button', { name: 'Apply merge' })
  expect(apply.disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: choice }))
  fireEvent.click(apply)
  expect(editor.value).toBe(expected)
  expect(screen.queryByRole('img')).toBeNull()
  expect(write).not.toHaveBeenCalled()
})

it('saves the merged canonical Markdown from the keyboard and reports a write failure without losing it', async () => {
  const markdownPath = 'notes.md'
  api.read.mockResolvedValueOnce({ data: { content: base } })
  const editor = await open(markdownPath)
  fireEvent.change(editor, { target: { value: 'See #1\ntwo\nthree\n' } })
  api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
  await emit(markdownPath)
  fireEvent.keyDown(editor, { key: 's', ctrlKey: true })
  expect(write).not.toHaveBeenCalled()
  write.mockRejectedValueOnce(new Error('Disk unavailable'))
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Merge and save' })))
  expect(write).toHaveBeenCalledExactlyOnceWith(markdownPath, `See #${storyIds[0]}\ntwo\nTHREE\n`)
  expect(editor.value).toBe('See #1\ntwo\nTHREE\n')
  expect(screen.getByText('Disk unavailable')).toBeTruthy()
  expect(screen.queryByRole('img')).toBeNull()
})

it('confirms a clean merge with Ctrl+S while focus is on the modal Close button', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
  await emit(path)
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  const dialog = screen.getByRole('dialog', { name: 'Review and merge' })
  const closeButton = within(dialog).getByRole('button', { name: 'Close' })
  expect(document.activeElement).toBe(closeButton)
  expect(write).not.toHaveBeenCalled()

  let allowed = true
  await act(async () => {
    allowed = fireEvent.keyDown(document.activeElement!, { key: 's', ctrlKey: true })
  })
  expect(allowed).toBe(false)
  expect(write).toHaveBeenCalledExactlyOnceWith(path, 'ONE\ntwo\nTHREE\n')
  expect(editor.value).toBe('ONE\ntwo\nTHREE\n')
  expect(screen.queryByRole('dialog', { name: 'Review and merge' })).toBeNull()
})

it('keeps focus in the dialog after resolving the last hunk and confirms with Cmd+S', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValueOnce({ data: { content: 'REMOTE\ntwo\nTHREE\n' } })
  await emit(path)
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  const dialog = screen.getByRole('dialog', { name: 'Review and merge' })
  const acceptBoth = screen.getByRole('button', { name: 'Accept both' })
  acceptBoth.focus()
  expect(document.activeElement).toBe(acceptBoth)

  const blockedAllowed = fireEvent.keyDown(document.activeElement!, { key: 's', metaKey: true })
  expect(blockedAllowed).toBe(false)
  expect(write).not.toHaveBeenCalled()

  fireEvent.click(acceptBoth)
  expect(dialog.contains(document.activeElement)).toBe(true)
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /Result/ }))

  let allowed = true
  await act(async () => {
    allowed = fireEvent.keyDown(document.activeElement!, { key: 's', metaKey: true })
  })
  expect(allowed).toBe(false)
  expect(write).toHaveBeenCalledExactlyOnceWith(path, 'ONE\nREMOTE\ntwo\nTHREE\n')
  expect(editor.value).toBe('ONE\nREMOTE\ntwo\nTHREE\n')
  expect(screen.queryByRole('dialog', { name: 'Review and merge' })).toBeNull()
})

it('resets useFileMerge conflicts and manual edits when input changes while mounted', () => {
  const { result, rerender } = renderHook((input) => useFileMerge(input), {
    initialProps: {
      path,
      base,
      ours: local,
      theirs: 'REMOTE\ntwo\nthree\n',
    },
  })
  expect(result.current.conflicts).toHaveLength(1)

  act(() => result.current.choose(0, 'theirs'))
  expect(result.current.conflicts).toHaveLength(0)
  expect(result.current.result).toBe('REMOTE\ntwo\nthree\n')

  act(() => result.current.setEdited('HAND EDITED\n'))
  expect(result.current.result).toBe('HAND EDITED\n')

  rerender({
    path,
    base,
    ours: 'one\nLOCAL\nthree\n',
    theirs: 'one\nINCOMING\nthree\n',
  })
  expect(result.current.conflicts).toEqual([
    { type: 'conflict', index: 1, ours: 'LOCAL\n', theirs: 'INCOMING\n' },
  ])
  expect(result.current.result).toBe('one\nLOCAL\nthree\n')
})

it('writes the confirmed merge once and clears the connected editor warning', async () => {
  render(<Editor connectedWrite />, { wrapper: Providers })
  fireEvent.click(screen.getByText('Open notes'))
  const editor = (await screen.findByRole('textbox')) as HTMLTextAreaElement
  await waitFor(() => expect(editor.value).toBe(base))
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
  await emit(path)
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(api.write).not.toHaveBeenCalled()
  const merged = 'ONE\ntwo\nTHREE\n'
  api.write.mockResolvedValueOnce({ data: { diff: '' } })
  api.read.mockResolvedValue({ data: { content: merged } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Merge and save' })))
  expect(api.write).toHaveBeenCalledExactlyOnceWith({
    path: { projectId: 'project' },
    body: { path, content: merged },
    throwOnError: true,
  })
  expect(editor.value).toBe(merged)
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Save' }).disabled).toBe(true)
})

it('does not write a merge after a newer change arrives, even before React renders it', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
  await emit(path)
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  const finish = screen.getByRole<HTMLButtonElement>('button', { name: 'Merge and save' })
  api.read.mockResolvedValueOnce({ data: { content: 'new remote\ntwo\nthree\n' } })
  await act(async () => {
    notify(path)
    fireEvent.click(finish)
  })
  expect(finish.disabled).toBe(true)
  expect(write).not.toHaveBeenCalled()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: 'Review and merge' })).toBeNull()
  expect(editor.value).toBe(local)
  expect(screen.getByRole('img', { name: 'Incoming edits overlap your changes' })).toBeTruthy()
})

it('does not announce the matching echo of an in-flight local save', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  let saved!: () => void
  api.write.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        saved = () => resolve({ data: { diff: '' } })
      }),
  )
  fireEvent.click(screen.getByText('Start write'))
  api.read.mockResolvedValue({ data: { content: local } })
  await emit(path)
  expect(screen.queryByText(toast)).toBeNull()
  await act(async () => saved())
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.queryByText(toast)).toBeNull()
})

it('recreates a remotely deleted file on save when keeping mine, even if edited back to base', async () => {
  render(<Editor connectedWrite />, { wrapper: Providers })
  fireEvent.click(screen.getByText('Open notes'))
  const editor = (await screen.findByRole('textbox')) as HTMLTextAreaElement
  await waitFor(() => expect(editor.value).toBe(base))
  fireEvent.change(editor, { target: { value: local } })

  api.read.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
  await emit(path, 'project', { kind: 'agent', runId: 'run-del' })

  const save = screen.getByRole<HTMLButtonElement>('button', { name: 'Save' })
  expect(save.disabled).toBe(true)

  const trigger = screen.getByRole('button', { name: 'File deleted remotely' })
  fireEvent.click(trigger)
  const callout = screen.getByRole('dialog', { name: 'File deleted remotely' })
  expect(
    within(callout).getByText(
      'If it was renamed or moved, it is treated as a delete here and a new file at the new path.',
    ),
  ).toBeTruthy()
  expect(within(callout).getByText('Source: Agent run run-del')).toBeTruthy()

  fireEvent.click(within(callout).getByRole('button', { name: 'Recreate on save' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByRole('img')).toBeNull()
  expect(api.write).not.toHaveBeenCalled()
  expect(editor.value).toBe(local)
  expect(save.disabled).toBe(false)

  // A follow-up 404 while still deleted on disk does not re-raise the warning or 404 alert.
  api.read.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
  await emit(path)
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.queryByRole('alert')).toBeNull()
  expect(save.disabled).toBe(false)

  // Even reverting the buffer to the old base text stays dirty because disk is deleted.
  fireEvent.change(editor, { target: { value: base } })
  expect(save.disabled).toBe(false)

  api.write.mockResolvedValueOnce({ data: { diff: '' } })
  api.read.mockResolvedValue({ data: { content: base } })
  await act(async () => fireEvent.click(save))
  expect(api.write).toHaveBeenCalledExactlyOnceWith({
    path: { projectId: 'project' },
    body: { path, content: base },
    throwOnError: true,
  })
  expect(save.disabled).toBe(true)
})

it('discards unsaved edits on a remotely deleted file and rejects a stale discard', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
  await emit(path)

  fireEvent.click(screen.getByRole('button', { name: 'File deleted remotely' }))
  const discard = screen.getByRole('button', { name: 'Discard mine' })

  // If the file is recreated on disk right before Discard mine runs, do not discard.
  api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
  await act(async () => {
    notify(path)
    fireEvent.click(discard)
  })
  expect(screen.getByRole<HTMLTextAreaElement>('textbox').value).toBe(local)
  expect(screen.getByRole('button', { name: 'Incoming edits can merge cleanly' })).toBeTruthy()

  // Delete again and confirm Discard mine closes the deleted file without writing.
  api.read.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
  await emit(path)
  fireEvent.click(screen.getByRole('button', { name: 'File deleted remotely' }))
  fireEvent.click(screen.getByRole('button', { name: 'Discard mine' }))
  expect(write).not.toHaveBeenCalled()
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.getByText('Select a file to view its contents.')).toBeTruthy()
})

it('treats a remote rename or move as delete plus create, explains the move, and tracks chained moves', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })

  api.read.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
  await act(async () =>
    notifyEvent({
      action: 'renamed',
      moves: [{ src: path, dst: 'docs/notes.txt' }],
      origin: { kind: 'person' },
    }),
  )

  // Watcher delete echo does not wipe out the known rename destination.
  api.read.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
  await act(async () =>
    notifyEvent({
      action: 'deleted',
      paths: [path],
    }),
  )

  const trigger = screen.getByRole('button', { name: 'File deleted remotely' })
  fireEvent.click(trigger)
  expect(screen.getByRole('dialog', { name: 'File renamed or moved remotely' })).toBeTruthy()
  expect(
    screen.getByText(
      'Moved to docs/notes.txt. Treated as a delete here and a new file at the new path.',
    ),
  ).toBeTruthy()
  expect(screen.getByText('Source: A person')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Recreate on save' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Discard mine' })).toBeTruthy()

  // Chained rename before resolving updates the open callout destination live in place.
  api.read.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
  await act(async () =>
    notifyEvent({
      action: 'renamed',
      moves: [{ src: 'docs/notes.txt', dst: 'archive/notes.txt' }],
    }),
  )
  expect(
    screen.getByText(
      'Moved to archive/notes.txt. Treated as a delete here and a new file at the new path.',
    ),
  ).toBeTruthy()
  expect(editor.value).toBe(local)
})

it('releases Save when a rename read still returns the current bytes', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValueOnce({ data: { content: base } })
  await act(async () =>
    notifyEvent({
      action: 'renamed',
      moves: [{ src: path, dst: 'docs/notes.txt' }],
      origin: { kind: 'person' },
    }),
  )

  expect(screen.queryByRole('img')).toBeNull()
  expect(editor.value).toBe(local)
  const save = screen.getByRole<HTMLButtonElement>('button', { name: 'Save' })
  expect(save.disabled).toBe(false)
  await act(async () => fireEvent.click(save))
  expect(write).toHaveBeenCalledExactlyOnceWith(path, local)
})

it('keeps the rename destination after a move whose read still returns the current bytes', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValueOnce({ data: { content: base } })
  await act(async () =>
    notifyEvent({
      action: 'renamed',
      moves: [{ src: path, dst: 'docs/notes.txt' }],
    }),
  )
  expect(screen.queryByRole('img')).toBeNull()
  expect(editor.value).toBe(local)

  api.read.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
  await act(async () =>
    notifyEvent({
      action: 'renamed',
      moves: [{ src: 'docs/notes.txt', dst: 'archive/notes.txt' }],
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'File deleted remotely' }))
  expect(
    screen.getByText(
      'Moved to archive/notes.txt. Treated as a delete here and a new file at the new path.',
    ),
  ).toBeTruthy()
  expect(editor.value).toBe(local)
})

it('opens merge on Save when a rename read returns changed bytes', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
  await act(async () =>
    notifyEvent({
      action: 'renamed',
      moves: [{ src: path, dst: 'docs/notes.txt' }],
      origin: { kind: 'person' },
    }),
  )

  expect(editor.value).toBe(local)
  expect(screen.getByRole('button', { name: 'Incoming edits can merge cleanly' })).toBeTruthy()
  const save = screen.getByRole<HTMLButtonElement>('button', { name: 'Save' })
  expect(save.disabled).toBe(false)
  fireEvent.click(save)
  expect(screen.getByRole('dialog', { name: 'Review and merge' })).toBeTruthy()
  expect(write).not.toHaveBeenCalled()
})

it('keeps the move destination on the callout when a rename read returns changed bytes', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
  await act(async () =>
    notifyEvent({
      action: 'renamed',
      moves: [{ src: path, dst: 'docs/notes.txt' }],
      origin: { kind: 'person' },
    }),
  )

  fireEvent.click(screen.getByRole('button', { name: 'Incoming edits can merge cleanly' }))
  expect(screen.getByText('0 conflicts with your edits. Moved to docs/notes.txt.')).toBeTruthy()
  expect(screen.getByText('Source: A person')).toBeTruthy()
  expect(editor.value).toBe(local)
})

it.each(['Keep mine', 'Take remote'] as const)(
  '%s runs after a rename whose read returns changed bytes',
  async (choice) => {
    const editor = await open()
    fireEvent.change(editor, { target: { value: local } })
    api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
    await act(async () =>
      notifyEvent({
        action: 'renamed',
        moves: [{ src: path, dst: 'docs/notes.txt' }],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Incoming edits can merge cleanly' }))
    fireEvent.click(screen.getByRole('button', { name: choice }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
    expect(write).not.toHaveBeenCalled()
    expect(editor.value).toBe(choice === 'Keep mine' ? local : cleanRemote)
    if (choice === 'Keep mine') {
      const save = screen.getByRole<HTMLButtonElement>('button', { name: 'Save' })
      expect(save.disabled).toBe(false)
      await act(async () => fireEvent.click(save))
      expect(write).toHaveBeenCalledExactlyOnceWith(path, local)
    }
  },
)

it('folds repeated remote changes into one remote head against the original base and never stacks merge dialogs', async () => {
  const fourLineBase = 'one\ntwo\nthree\nfour\n'
  api.read.mockResolvedValueOnce({ data: { content: fourLineBase } })
  const editor = await open(path, fourLineBase)
  fireEvent.change(editor, { target: { value: 'ONE\ntwo\nthree\nfour\n' } })

  // Three remote changes before the person opens merge fold into one remote head.
  api.read.mockResolvedValueOnce({ data: { content: 'one\nTWO\nthree\nfour\n' } })
  await emit(path)
  api.read.mockResolvedValueOnce({ data: { content: 'one\nTWO\nTHREE\nfour\n' } })
  await emit(path)
  api.read.mockResolvedValueOnce({ data: { content: 'one\nTWO\nTHREE\nFOUR\n' } })
  await emit(path)

  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getAllByRole('dialog', { name: 'Review and merge' })).toHaveLength(1)
  expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: /Result/ }).value).toBe(
    'ONE\nTWO\nTHREE\nFOUR\n',
  )

  // Duplicate broadcast returning the same remote text does not mark the open merge stale.
  api.read.mockResolvedValueOnce({ data: { content: 'one\nTWO\nTHREE\nFOUR\n' } })
  await emit(path)
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Merge and save' }).disabled).toBe(
    false,
  )

  // Two further remote changes while the dialog is open fold via Load latest remote in the same dialog.
  api.read.mockResolvedValueOnce({ data: { content: 'one\nTWO!\nTHREE\nFOUR\n' } })
  await emit(path)
  api.read.mockResolvedValueOnce({ data: { content: 'one\nTWO!\nTHREE!\nFOUR!\n' } })
  await emit(path)

  expect(screen.getAllByRole('dialog', { name: 'Review and merge' })).toHaveLength(1)
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Merge and save' }).disabled).toBe(
    true,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Load latest remote' }))
  expect(screen.getAllByRole('dialog', { name: 'Review and merge' })).toHaveLength(1)
  expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: /Result/ }).value).toBe(
    'ONE\nTWO!\nTHREE!\nFOUR!\n',
  )

  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Merge and save' })))
  expect(write).toHaveBeenCalledExactlyOnceWith(path, 'ONE\nTWO!\nTHREE!\nFOUR!\n')
  expect(screen.queryByRole('dialog', { name: 'Review and merge' })).toBeNull()
})

it('closes an open merge dialog when the file is deleted remotely during review', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
  await emit(path)
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByRole('dialog', { name: 'Review and merge' })).toBeTruthy()

  api.read.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
  await emit(path)
  expect(screen.queryByRole('dialog', { name: 'Review and merge' })).toBeNull()
  expect(editor.value).toBe(local)
  expect(screen.getByRole('img', { name: 'File deleted remotely' })).toBeTruthy()
})

it('keeps focus inside the merge dialog when Load latest remote unmounts the stale alert button', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })
  api.read.mockResolvedValueOnce({ data: { content: cleanRemote } })
  await emit(path)
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  const dialog = screen.getByRole('dialog', { name: 'Review and merge' })
  api.read.mockResolvedValueOnce({ data: { content: 'one\nTWO\nTHREE\n' } })
  await emit(path)

  const reload = screen.getByRole('button', { name: 'Load latest remote' })
  reload.focus()
  expect(document.activeElement).toBe(reload)

  fireEvent.click(reload)
  expect(dialog.contains(document.activeElement)).toBe(true)
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /Result/ }))
})

it('clears the kept draft when an empty file is recreated remotely after Recreate on save and Take remote is chosen', async () => {
  const editor = await open()
  fireEvent.change(editor, { target: { value: local } })

  api.read.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
  await emit(path)
  fireEvent.click(screen.getByRole('button', { name: 'File deleted remotely' }))
  fireEvent.click(screen.getByRole('button', { name: 'Recreate on save' }))
  expect(editor.value).toBe(local)

  api.read.mockResolvedValueOnce({ data: { content: '' } })
  await emit(path)
  fireEvent.click(screen.getByRole('button', { name: 'Incoming edits can merge cleanly' }))
  fireEvent.click(screen.getByRole('button', { name: 'Take remote' }))

  expect(editor.value).toBe('')
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Save' }).disabled).toBe(true)
})
