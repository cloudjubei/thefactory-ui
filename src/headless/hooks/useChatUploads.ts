import { useSyncExternalStore } from 'react'
import type { ChatAttachmentUpload, ChatUploads } from '../utils/chatAttachmentUploadTypes'

const NOTHING: readonly ChatAttachmentUpload[] = []
const noSubscription = () => () => {}
const noUploads = () => NOTHING

/** A chat's uploads, live; nothing where the composer has no way to upload. */
export function useChatUploads(uploads: ChatUploads | undefined): readonly ChatAttachmentUpload[] {
  const getUploads = uploads?.getUploads ?? noUploads
  return useSyncExternalStore(uploads?.subscribe ?? noSubscription, getUploads, getUploads)
}
