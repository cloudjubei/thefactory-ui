import { createRef } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProjectAppView, { type ProjectAppViewHandle } from './ProjectAppView'

afterEach(cleanup)

describe('ProjectAppView captureHtml', () => {
  it('accepts only the mounted frame and expected origin, without dispatching responses as app requests', async () => {
    const ref = createRef<ProjectAppViewHandle>()
    const handler = vi.fn()
    const { container } = render(
      <ProjectAppView ref={ref} url="https://app.test/view" onBridgeMessage={handler} />,
    )
    const frame = container.querySelector('iframe')!
    const post = vi.spyOn(frame.contentWindow!, 'postMessage')
    const capture = ref.current!.captureHtml()
    const request = post.mock.calls[0][0]
    expect(post.mock.calls[0][1]).toBe('https://app.test')
    const data = {
      overseerBridgeResponse: true,
      id: request.id,
      ok: true,
      result: { html: '<html>my current view</html>' },
    }
    const settled = vi.fn()
    void capture.then(settled)
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', { data, source: window, origin: 'https://app.test' }),
      )
      window.dispatchEvent(
        new MessageEvent('message', {
          data,
          source: frame.contentWindow,
          origin: 'https://other.test',
        }),
      )
    })
    expect(settled).not.toHaveBeenCalled()
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data,
          source: frame.contentWindow,
          origin: 'https://app.test',
        }),
      )
      await capture
    })
    expect(settled).toHaveBeenCalledWith('<html>my current view</html>')
    expect(handler).not.toHaveBeenCalled()
  })

  it('rejects when unavailable and cancels pending work on project remount', async () => {
    const ref = createRef<ProjectAppViewHandle>()
    const { rerender } = render(<ProjectAppView ref={ref} url={undefined} />)
    await expect(ref.current!.captureHtml()).rejects.toThrow('No App view')
    rerender(<ProjectAppView ref={ref} url="https://app.test/view" />)
    const result = expect(ref.current!.captureHtml()).rejects.toThrow('closed or navigated')
    rerender(<ProjectAppView ref={ref} url="https://app.test/view" remountKey={1} />)
    await result
  })
})
