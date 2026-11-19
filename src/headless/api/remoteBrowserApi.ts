import {
  closeRemoteBrowserSession,
  listRemoteBrowserSessions,
  markRemoteBrowserArea,
  openRemoteBrowserSession,
  pickRemoteBrowserElement,
  resizeRemoteBrowser,
  sendRemoteBrowserInput,
  type ChatContext,
} from './generated'
import type { RemoteBrowserApi } from '../utils/remoteBrowserTypes'

const chat = (context: ChatContext) => ({ context: JSON.stringify(context) })

/** The browser beside a chat, through the backend's `remote-browser` routes. */
export const REMOTE_BROWSER_ROUTES: RemoteBrowserApi = {
  list: async (projectId, context) =>
    (
      await listRemoteBrowserSessions({
        path: { projectId },
        query: chat(context),
        throwOnError: true,
      })
    ).data,
  open: async (projectId, context, body) =>
    (
      await openRemoteBrowserSession({
        path: { projectId },
        query: chat(context),
        body,
        throwOnError: true,
      })
    ).data,
  close: async (projectId, context, sessionId) => {
    await closeRemoteBrowserSession({
      path: { projectId, sessionId },
      query: chat(context),
      throwOnError: true,
    })
  },
  input: async (projectId, context, sessionId, input) =>
    (
      await sendRemoteBrowserInput({
        path: { projectId, sessionId },
        query: chat(context),
        body: input,
        throwOnError: true,
      })
    ).data,
  resize: async (projectId, context, sessionId, viewport) =>
    (
      await resizeRemoteBrowser({
        path: { projectId, sessionId },
        query: chat(context),
        body: viewport,
        throwOnError: true,
      })
    ).data,
  pick: async (projectId, context, sessionId, point) =>
    (
      await pickRemoteBrowserElement({
        path: { projectId, sessionId },
        query: chat(context),
        body: point,
        throwOnError: true,
      })
    ).data,
  mark: async (projectId, context, sessionId, box) =>
    (
      await markRemoteBrowserArea({
        path: { projectId, sessionId },
        query: chat(context),
        body: box,
        throwOnError: true,
      })
    ).data,
}
