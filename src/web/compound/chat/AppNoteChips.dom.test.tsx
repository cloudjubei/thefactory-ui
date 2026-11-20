import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import AppNoteChips from './AppNoteChips'
import type { AppNote } from '../../../headless/utils/appNotesTypes'

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
})
