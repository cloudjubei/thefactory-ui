/** A chat composer that takes dropped files, as the window's drag controller knows it. */
export type ChatDropTargetInfo = {
  id: string
  /** The chat's name, as the overlay names it. */
  title: string
  /** When the person last focused or clicked inside this chat (epoch ms). */
  lastActiveAt: number
}

export type ChatDropInput = {
  /** OS files are being dragged over the window. */
  dragging: boolean
  shiftKey: boolean
  /** The chat panel under the pointer, if any. */
  over: ChatDropTargetInfo | null
  /** The chat a Shift-drop elsewhere goes to, if any chat is open. */
  current: ChatDropTargetInfo | null
}

/** What a drop does: attach to a chat, or swallow it so the window never navigates to the file. */
export type ChatDropAction = { kind: 'attach'; targetId: string } | { kind: 'swallow' }

export type ChatDropOverlayView =
  | { visible: false }
  | {
      visible: true
      /** Over a chat panel: that panel is highlighted. Elsewhere: a hint at the bottom of the window. */
      placement: 'over-chat' | 'elsewhere'
      message: string
      /** The drop will attach (otherwise it is swallowed). */
      willAttach: boolean
      targetId?: string
    }

export type AttachmentUploadStatus = 'uploading' | 'error'

/** A file on its way into the composer, or one that could not be added. */
export type AttachmentUpload = {
  id: string
  name: string
  status: AttachmentUploadStatus
  error?: string
}
