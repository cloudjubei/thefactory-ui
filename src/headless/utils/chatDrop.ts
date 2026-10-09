import { VIEWABLE_IMAGE_MEDIA_TYPES } from 'thefactory-tools/constants'
import { CHAT_DROP_TEXT, FILE_DRAG_TYPE } from './chatDropConstants'
import type {
  ChatDropAction,
  ChatDropInput,
  ChatDropOverlayView,
  ChatDropTargetInfo,
} from './chatDropTypes'

const MB = 1024 * 1024

/** Whether a drag carries OS files — the only drags the chat drop controller acts on. */
export function isFileDrag(types: readonly string[] | null | undefined): boolean {
  return !!types && Array.from(types).includes(FILE_DRAG_TYPE)
}

/** The chat a Shift-drop outside any chat panel goes to: the one most recently focused. */
export function currentChatDropTarget(
  targets: readonly ChatDropTargetInfo[],
): ChatDropTargetInfo | null {
  let best: ChatDropTargetInfo | null = null
  for (const target of targets) {
    if (!best || target.lastActiveAt > best.lastActiveAt) best = target
  }
  return best
}

export function chatDropAction(input: ChatDropInput): ChatDropAction {
  if (input.over) return { kind: 'attach', targetId: input.over.id }
  if (input.shiftKey && input.current) return { kind: 'attach', targetId: input.current.id }
  return { kind: 'swallow' }
}

export function chatDropOverlay(input: ChatDropInput): ChatDropOverlayView {
  if (!input.dragging) return { visible: false }
  if (input.over) {
    return {
      visible: true,
      placement: 'over-chat',
      message: CHAT_DROP_TEXT.dropHere,
      willAttach: true,
      targetId: input.over.id,
    }
  }
  if (!input.current) {
    return {
      visible: true,
      placement: 'elsewhere',
      message: CHAT_DROP_TEXT.noChat,
      willAttach: false,
    }
  }
  if (input.shiftKey) {
    return {
      visible: true,
      placement: 'elsewhere',
      message: CHAT_DROP_TEXT.releaseTo(input.current.title),
      willAttach: true,
      targetId: input.current.id,
    }
  }
  return {
    visible: true,
    placement: 'elsewhere',
    message: CHAT_DROP_TEXT.holdShift,
    willAttach: false,
  }
}

/** An attachment the agent can look at as an image, so its chip shows a thumbnail. */
export function isImageAttachment(name: string): boolean {
  const base = name.split('/').pop() ?? ''
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return false
  return base.slice(dot + 1).toLowerCase() in VIEWABLE_IMAGE_MEDIA_TYPES
}

/** Why a file cannot be attached, or `undefined` when it can. */
export function attachmentUploadError(
  file: { name: string; size: number },
  maxBytes: number,
): string | undefined {
  if (file.size <= maxBytes) return undefined
  return `${file.name} is ${(file.size / MB).toFixed(1)} MB — attachments can be up to ${Math.round(maxBytes / MB)} MB.`
}
