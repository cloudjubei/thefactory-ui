import { useEffect, useMemo, useRef } from 'react'
import { chatFilePreviewTarget } from '../utils/chatFilePreview'
import type { ChatFileSourceOf } from '../utils/chatFilePreviewTypes'
import { ChatFilePreviewCalls } from './chatFilePreviewCalls'
import { useFilePreview, type FilePreviewHandle } from './useFilePreview'

/** One of a chat's own files, read for its preview from where the chat holds it. */
export function useChatFilePreview(
  path: string | null,
  sourceOf: ChatFileSourceOf,
): FilePreviewHandle {
  const sourceRef = useRef(sourceOf)
  useEffect(() => {
    sourceRef.current = sourceOf
  }, [sourceOf])
  const calls = useMemo(() => new ChatFilePreviewCalls(() => sourceRef.current), [])
  const target = useMemo(() => (path ? chatFilePreviewTarget(path) : null), [path])
  return useFilePreview(target, calls)
}
