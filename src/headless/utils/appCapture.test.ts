import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppCaptureRequests, APP_CAPTURE_TIMEOUT_MS, liveAppCaptureRequest } from './appCapture'

describe('AppCaptureRequests', () => {
  afterEach(() => vi.useRealTimers())

  it('requests the live DOM and correlates concurrent object and native JSON answers', async () => {
    const send = vi.fn()
    const capture = new AppCaptureRequests(send)
    const first = capture.captureHtml()
    const second = capture.captureHtml()
    const [one, two] = send.mock.calls.map(([request]) => request)
    expect(one.type).toBe('overseer:capture-html')
    expect(one.id).not.toBe(two.id)
    expect(capture.receive({ overseerBridgeResponse: true, id: 'unrelated', ok: true })).toBe(false)
    capture.receive(
      JSON.stringify({
        overseerBridgeResponse: true,
        id: two.id,
        ok: true,
        result: { html: '<html>current input</html>' },
      }),
    )
    capture.receive({
      overseerBridgeResponse: true,
      id: one.id,
      ok: true,
      result: { html: '<html>current tab</html>' },
    })
    await expect(first).resolves.toBe('<html>current tab</html>')
    await expect(second).resolves.toBe('<html>current input</html>')
  })

  it('rejects missing bridges on a bounded timeout', async () => {
    vi.useFakeTimers()
    const capture = new AppCaptureRequests(() => {})
    const result = expect(capture.captureHtml()).rejects.toThrow('did not answer')
    await vi.advanceTimersByTimeAsync(APP_CAPTURE_TIMEOUT_MS)
    await result
  })

  it('rejects errors, malformed HTML and send failures', async () => {
    const send = vi.fn()
    const capture = new AppCaptureRequests(send)
    for (const answer of [
      { ok: false, error: 'unavailable' },
      { ok: true, result: {} },
      { ok: true, result: { html: '' } },
    ]) {
      const pending = capture.captureHtml()
      capture.receive({ overseerBridgeResponse: true, id: send.mock.lastCall![0].id, ...answer })
      await expect(pending).rejects.toThrow()
    }
    await expect(
      new AppCaptureRequests(() => {
        throw new Error('closed')
      }).captureHtml(),
    ).rejects.toThrow('closed')
    expect(capture.receive('not JSON')).toBe(false)
  })

  it('cancels on remount and never accepts a late response for the next capture', async () => {
    const send = vi.fn()
    const capture = new AppCaptureRequests(send)
    const pending = capture.captureHtml()
    const oldId = send.mock.lastCall![0].id
    capture.cancel()
    await expect(pending).rejects.toThrow('closed or navigated')
    const next = capture.captureHtml()
    expect(
      capture.receive({
        overseerBridgeResponse: true,
        id: oldId,
        ok: true,
        result: { html: 'stale' },
      }),
    ).toBe(false)
    capture.cancel()
    await expect(next).rejects.toThrow()
  })
})

describe('liveAppCaptureRequest', () => {
  it('accepts only nonempty request ids for this project', () => {
    expect(liveAppCaptureRequest({ projectId: 'p', requestId: 'r' }, 'p')).toBe('r')
    for (const raw of [
      null,
      {},
      { projectId: 'other', requestId: 'r' },
      { projectId: 'p', requestId: '' },
      { projectId: 'p', requestId: 1 },
    ]) {
      expect(liveAppCaptureRequest(raw, 'p')).toBeNull()
    }
  })
})
