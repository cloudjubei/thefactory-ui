import { useEffect, useMemo, useRef, useState } from 'react'
import { PROJECT_FILE_CALLS } from '../api/projectFileApi'
import type {
  FilePreviewCalls,
  FilePreviewState,
  FilePreviewTarget,
} from '../utils/filePreviewTypes'
import { FilePreviewLoader } from './filePreviewLoader'

export type FilePreviewHandle = {
  /** The file as it stands; `null` with nothing to preview. */
  state: FilePreviewState | null
  reload: () => void
}

/**
 * One file, read for its preview from the project it is in — not the one on
 * screen, and never through the Files screen's selection.
 */
export function useFilePreview(
  target: FilePreviewTarget | null,
  calls: FilePreviewCalls = PROJECT_FILE_CALLS,
): FilePreviewHandle {
  const [state, setState] = useState<FilePreviewState | null>(null)
  const loaderRef = useRef<FilePreviewLoader | null>(null)
  if (!loaderRef.current) loaderRef.current = new FilePreviewLoader(calls, setState)
  const loader = loaderRef.current
  const projectId = target?.projectId
  const path = target?.path
  const projectName = target?.projectName
  const name = target?.name
  useEffect(() => {
    loader.open(
      projectId && path
        ? { projectId, path, ...(projectName ? { projectName } : {}), ...(name ? { name } : {}) }
        : null,
    )
    return () => loader.open(null)
  }, [loader, projectId, path, projectName, name])
  const actions = useMemo(
    () => ({
      reload: () => loader.reload(),
    }),
    [loader],
  )
  const shown = state ?? (target ? { status: 'loading' as const, target } : null)
  return { state: shown, ...actions }
}
