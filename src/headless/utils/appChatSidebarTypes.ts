/** What an app's `chat.requestSidebar` asks for. */
export interface AppChatSidebarRequest {
  /** The process run whose own chat opens; absent, the project's chat. */
  runId?: string
  /** A message the host sends into that run's chat once it is open. */
  message?: string
}
