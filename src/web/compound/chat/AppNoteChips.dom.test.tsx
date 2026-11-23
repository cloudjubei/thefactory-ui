import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import type { UploadChatFile } from '../../../headless/api/chatAttachmentUploadTypes'
import { useAppNotes } from '../../../headless/hooks/useAppNotes'
import type { AppNote } from '../../../headless/utils/appNotesTypes'
import type { ScreenshotAnnotationComposer } from '../../../headless/utils/screenshotAnnotationTypes'
import {
  appPixels,
  deferred,
  fakeAdapter,
  flush,
  launchFor,
} from '../../../headless/utils/testUtils/screenshotAnnotationFakes'
import AppNoteChips from './AppNoteChips'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('App note chips', () => {
  it('shows multiple picks as text, edits comments, removes by id and opens the app', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const change = vi.fn()
    const show = vi.fn()
    const picks: AppNote[] = [
      {
        id: 'a',
        projectId: 'p',
        comment: 'First',
        targets: [{ kind: 'element', selector: '#a', outerHtml: '<script>bad()</script>' }],
      },
      {
        id: 'b',
        projectId: 'p',
        comment: 'Second',
        targets: [{ kind: 'element', selector: '#b', outerHtml: '<p>B</p>' }],
      },
    ]
    await act(async () =>
      root.render(<AppNoteChips appNotes={picks} onChangeAppNotes={change} onShowApp={show} />),
    )
    expect(host.querySelectorAll('textarea')).toHaveLength(2)
    expect(host.querySelector('script')).toBeNull()
    const labels = [...host.querySelectorAll('code')]
    expect(labels.map((code) => code.textContent)).toEqual(['1. #a', '2. #b'])
    expect(labels[0].getAttribute('title')).toBe('<script>bad()</script>')
    const area = host.querySelector('textarea')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
        area,
        'Updated',
      )
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(change).toHaveBeenLastCalledWith([{ ...picks[0], comment: 'Updated' }, picks[1]])
    await act(async () =>
      (host.querySelector('[aria-label="Remove app selection 1"]') as HTMLButtonElement).click(),
    )
    expect(change).toHaveBeenLastCalledWith([picks[1]])
    await act(async () => (host.querySelector('button') as HTMLButtonElement).click())
    expect(show).toHaveBeenCalledOnce()
    await act(async () => root.unmount())
  })

  it('keeps a second capture off an existing note id, so editing or removing one leaves the other', async () => {
    Object.assign(URL, {
      createObjectURL: () => 'blob:shot',
      revokeObjectURL: () => {},
    })
    const host = document.createElement('div')
    const root = createRoot(host)
    const fake = fakeAdapter()
    const calls: { done: ReturnType<typeof deferred<string>> }[] = []
    const upload = vi.fn<UploadChatFile>(() => {
      const done = deferred<string>()
      calls.push({ done })
      return done.promise
    })
    const seen: { notes: AppNote[] } = { notes: [] }

    function Composer({ open }: { open: boolean }) {
      const { appNotes, onChangeAppNotes, addPick } = useAppNotes()
      seen.notes = appNotes
      const screenshot: ScreenshotAnnotationComposer = {
        adapter: fake.adapter,
        launch: () => launchFor('chat-a'),
        upload,
        onNote: (note) => onChangeAppNotes((current) => [...current, note]),
      }
      return (
        <div>
          <button
            type="button"
            onClick={() => addPick('p1', { selector: '#save', outerHtml: '<button>Save</button>' })}
          >
            Pick
          </button>
          {open ? (
            <AppNoteChips
              appNotes={appNotes}
              onChangeAppNotes={onChangeAppNotes}
              screenshot={screenshot}
            />
          ) : null}
        </div>
      )
    }

    const click = async (name: string) => {
      const button = [...host.querySelectorAll('button')].find(
        (item) => item.textContent?.trim() === name,
      ) as HTMLButtonElement | undefined
      if (!button) throw new Error(`No button named ${name}`)
      if (button.disabled) throw new Error(`${name} is disabled`)
      await act(async () => {
        button.click()
      })
    }
    const addCapture = async (index: number, path: string) => {
      await click('Capture')
      await act(async () => {
        fake.captures[index]?.resolve(appPixels(`shot-${index}.png`))
        await flush()
      })
      await click('Add to chat')
      await act(async () => {
        calls[index]?.done.resolve(path)
        await flush()
      })
    }

    let open = true
    const render = () => root.render(<Composer open={open} />)
    await act(async () => render())
    await click('Pick')
    await addCapture(0, '.factory/attachments/chat-a/shot.png')
    open = false
    await act(async () => render())
    open = true
    await act(async () => render())
    await addCapture(1, '.factory/attachments/chat-a/second.png')

    expect(seen.notes.map((note) => note.id)).toEqual(['app-note-1', 'app-note-2', 'app-note-3'])

    const area = host.querySelector(
      '[aria-label="Comment on app selection 2"]',
    ) as HTMLTextAreaElement
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
        area,
        'Only this note',
      )
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(seen.notes.map((note) => note.comment)).toEqual(['', 'Only this note', ''])

    await act(async () => {
      ;(host.querySelector('[aria-label="Remove app selection 1"]') as HTMLButtonElement).click()
    })
    expect(seen.notes.map((note) => note.id)).toEqual(['app-note-2', 'app-note-3'])
    expect(seen.notes.map((note) => note.comment)).toEqual(['Only this note', ''])
    await act(async () => root.unmount())
  })
})
