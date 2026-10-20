import { openProcessRunChat } from './generated'
import type { ChatContext } from './generated'
import { extractErrorMessage } from './errorMessage'
import { APP_RUN_CHAT_FAILED } from '../utils/appChatSidebarConstants'

/** Open a process run's own chat for an app's sidebar, creating it the first time. */
export async function openAppRunChat(runId: string): Promise<ChatContext> {
  try {
    const { data } = await openProcessRunChat({ path: { runId }, throwOnError: true })
    return (data as { context: ChatContext }).context
  } catch (err) {
    throw new Error(extractErrorMessage(err, APP_RUN_CHAT_FAILED))
  }
}
