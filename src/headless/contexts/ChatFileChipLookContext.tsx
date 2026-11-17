import { createContext, useContext } from 'react'
import { CHAT_FILE_CHIP_LOOK } from '../utils/chatFileChipConstants'
import type { ChatFileChipLook } from '../utils/chatFileChipTypes'

/** How files on a message are drawn as chips. The app keeps the default; a showcase sets one to compare. */
export const ChatFileChipLookContext = createContext<ChatFileChipLook>(CHAT_FILE_CHIP_LOOK)

export const useChatFileChipLook = (): ChatFileChipLook => useContext(ChatFileChipLookContext)
