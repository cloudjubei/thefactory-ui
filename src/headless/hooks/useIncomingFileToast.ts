import { useEffect, useRef } from 'react'
import type { PendingFileChange } from '../utils/pendingFileChange'
import { INCOMING_FILE_EDITS } from '../utils/pendingFileChange'
import type { ToastMessage } from './useToastQueue'

/** Announce the start of a pending episode, not each revision or color change. */
export function useIncomingFileToast(
  path: string | undefined,
  kind: PendingFileChange['kind'] | undefined,
  toast: (message: ToastMessage) => void,
) {
  const announced = useRef<{ path: string | undefined } | null>(null)
  useEffect(() => {
    if (!kind) {
      announced.current = null
    } else if (!announced.current || announced.current.path !== path) {
      announced.current = { path }
      toast({ title: INCOMING_FILE_EDITS, variant: 'warning' })
    }
  }, [path, kind, toast])
}
