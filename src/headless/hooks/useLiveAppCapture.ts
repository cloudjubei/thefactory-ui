import { useEffect, type RefObject } from 'react'
import { useOptionalApi } from '../api/ApiContext'
import { client } from '../api/generated/client.gen'
import { liveAppCaptureRequest, type ProjectAppViewHandle } from '../utils/appCapture'

/** Listen only while this project's real App surface is mounted. DOM travels over authenticated HTTP, never WS. */
export function useLiveAppCapture(
  projectId: string | undefined,
  view: RefObject<ProjectAppViewHandle | null>,
): void {
  const api = useOptionalApi()
  const ws = api?.ws
  useEffect(() => {
    if (!ws || !projectId) return
    let active = true
    const seen = new Set<string>()
    const off = ws.on('appView:capture-requested', (event) => {
      const requestId = liveAppCaptureRequest(event, projectId)
      if (!requestId || seen.has(requestId) || !view.current) return
      seen.add(requestId)
      if (seen.size > 64) seen.delete(seen.values().next().value!)
      void (async () => {
        let body: { html: string } | { error: string }
        try {
          body = { html: await view.current!.captureHtml() }
        } catch {
          // Never send exception text: platform errors can include the signed view URL.
          body = {
            error: 'The open App view could not capture HTML. Check its bridge and try again.',
          }
        }
        if (!active) return
        try {
          await client.post({
            url: `/api/v1/projects/${encodeURIComponent(projectId)}/view/captures/${encodeURIComponent(requestId)}`,
            body,
            headers: { 'Content-Type': 'application/json' },
            throwOnError: true,
          })
        } catch {
          // Another client may have answered first, or the request expired. Never log the DOM.
        }
      })()
    })
    return () => {
      active = false
      off()
    }
  }, [ws, projectId, view])
}
