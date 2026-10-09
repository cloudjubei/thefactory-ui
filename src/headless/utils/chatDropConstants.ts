/** The DataTransfer type an OS file drag carries; internal drags (board, git staging) do not. */
export const FILE_DRAG_TYPE = 'Files'

/** Marks a chat panel: a plain file drop anywhere inside it attaches to that chat. */
export const CHAT_PANEL_ATTRIBUTE = 'data-chat-panel'

/** Marks a surface that takes OS file drops itself (the Design tab); the chat drop controller leaves them to it. */
export const FILE_DROP_ZONE_ATTRIBUTE = 'data-file-drop-zone'

export const CHAT_DROP_TEXT = {
  dropHere: 'Drop to add to chat',
  holdShift: 'Hold Shift to add to chat',
  releaseTo: (title: string) => `Release to add to ${title}`,
  noChat: 'No chat is open — open one to add files',
} as const
