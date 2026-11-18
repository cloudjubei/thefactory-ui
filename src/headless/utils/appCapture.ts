import type { BridgeRequest } from './appBridge'

/** Public ref API shared by the iframe and native WebView. */
export interface ProjectAppViewHandle {
  /** Capture the mounted document, including its live form state, without reloading it. */
  captureHtml(): Promise<string>
}

export const APP_CAPTURE_TIMEOUT_MS = 10_000
export const APP_CAPTURE_MAX_CHARS = 2_000_000

/** Host-initiated bridge calls are separate from the app-initiated request dispatcher. */
export class AppCaptureRequests implements ProjectAppViewHandle {
  private sequence = 0
  private readonly pending = new Map<
    string,
    {
      resolve: (html: string) => void
      reject: (error: Error) => void
      timer: ReturnType<typeof setTimeout>
    }
  >()

  private readonly send: (request: BridgeRequest) => void

  constructor(send: (request: BridgeRequest) => void) {
    this.send = send
  }

  captureHtml(): Promise<string> {
    const id = `app-capture-${++this.sequence}`
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('The App did not answer capture-html. Update its bridge and try again.'))
      }, APP_CAPTURE_TIMEOUT_MS)
      this.pending.set(id, { resolve, reject, timer })
      try {
        this.send({ type: 'overseer:capture-html', id })
      } catch (error) {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(error)
      }
    })
  }

  /** True only for a response to one of our outstanding calls. */
  receive(raw: unknown): boolean {
    let value = raw
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value)
      } catch {
        return false
      }
    }
    if (!value || typeof value !== 'object') return false
    const response = value as {
      overseerBridgeResponse?: unknown
      id?: unknown
      ok?: unknown
      result?: { html?: unknown }
      error?: unknown
    }
    if (response.overseerBridgeResponse !== true || typeof response.id !== 'string') return false
    const call = this.pending.get(response.id)
    if (!call) return false
    clearTimeout(call.timer)
    this.pending.delete(response.id)
    const html = response.result?.html
    if (
      response.ok === true &&
      typeof html === 'string' &&
      html.length > 0 &&
      html.length <= APP_CAPTURE_MAX_CHARS
    ) {
      call.resolve(html)
    } else {
      call.reject(
        new Error(
          typeof response.error === 'string'
            ? response.error
            : 'The App returned invalid or oversized capture HTML.',
        ),
      )
    }
    return true
  }

  cancel(): void {
    for (const call of this.pending.values()) {
      clearTimeout(call.timer)
      call.reject(new Error('The App view closed or navigated before capture completed.'))
    }
    this.pending.clear()
  }
}

export function liveAppCaptureRequest(raw: unknown, projectId: string): string | null {
  if (!raw || typeof raw !== 'object') return null
  const request = raw as { projectId?: unknown; requestId?: unknown }
  return request.projectId === projectId &&
    typeof request.requestId === 'string' &&
    request.requestId.length > 0
    ? request.requestId
    : null
}
