import type { GetChatResponse } from '../api/generated'
import type { ChatMessagesShape } from './chatListEntry'
import type { ChatNotifyLevel } from './chatNotifyTypes'

/** A chat as telling whether news for the person reached it reads it — loaded or summarised. */
export type ChatNewsEntry = ChatMessagesShape & {
  context: GetChatResponse['context']
  /** The person's own level for the chat, over its kind's. */
  notifyLevel?: ChatNotifyLevel
}

/** The newest message for the person each chat held when last looked at, by chat key. */
export type ChatNewsMarks = ReadonlyMap<string, string>

/** Whether news reached the person since the marks, and the marks to look against next. */
export type ChatNewsCheck = { arrived: boolean; marks: ChatNewsMarks }
