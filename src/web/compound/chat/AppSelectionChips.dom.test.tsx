import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import AppSelectionChips from './AppSelectionChips'
import type { AppSelection } from '../../../headless/utils/appSelections'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('App selection chips', () => {
  it('shows multiple picks as text, edits comments, removes by id and opens the app', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const change = vi.fn()
    const show = vi.fn()
    const picks: AppSelection[] = [
      {
        id: 'a',
        projectId: 'p',
        selector: '#a',
        outerHtml: '<script>bad()</script>',
        comment: 'First',
      },
      { id: 'b', projectId: 'p', selector: '#b', outerHtml: '<p>B</p>', comment: 'Second' },
    ]
    await act(async () =>
      root.render(
        <AppSelectionChips appSelections={picks} onChangeAppSelections={change} onShowApp={show} />,
      ),
    )
    expect(host.querySelectorAll('textarea')).toHaveLength(2)
    expect(host.querySelector('script')).toBeNull()
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
