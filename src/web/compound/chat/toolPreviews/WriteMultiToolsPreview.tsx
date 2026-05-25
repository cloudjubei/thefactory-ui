import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Spinner from '../../../primitives/Spinner'
import { GitFileChangesPills } from '../../git/common/GitFileChangesPills'
import GitFileStatusIcon from '../../git/common/GitFileStatusIcon'
import { PathDisplay } from '../../PathDisplay'
import { StructuredUnifiedDiff } from '../../diff/diffUtils'
import { cn } from '../../../utils/cn'
import { IconChevron } from '../../../icons'
import type { ToolCall, ToolResultType } from '../ToolCall'
import { tryString } from '../../../../headless/utils/toolPreview'

export type WriteMultiToolsPreviewProps = {
  toolCall: ToolCall
  result?: unknown
  resultType?: ToolResultType
}

/**
 * Hover-card preview for `writeExactReplaces` (multi-file write). Groups
 * results by path with expand/collapse + per-file diff. Lifted from
 * `overseer-local`'s `WriteMultiToolsPreview` so both apps share the same
 * rendering surface.
 */
export function WriteMultiToolsPreview({
  toolCall: _toolCall,
  result,
  resultType,
}: WriteMultiToolsPreviewProps) {
  const isInFlight =
    resultType === 'pending' || resultType === 'running' || resultType === 'require_confirmation'

  const resultError = useMemo<string | undefined>(() => {
    if (resultType === 'errored') {
      const r = result as { message?: unknown; error?: unknown; result?: unknown } | undefined
      const msg = r?.message ?? r?.error ?? r?.result ?? String(result)
      return tryString(msg)
    }
    return undefined
  }, [result, resultType])

  const isPreviewObject = !!(result && typeof result === 'object' && 'status' in (result as object))
  const preview = isPreviewObject
    ? (result as
        | { status: 'pending' }
        | { status: 'error'; error: string }
        | { status: 'ready'; patch: string })
    : undefined

  const actualData = useMemo<unknown>(() => {
    if (preview) {
      if (preview.status === 'ready') {
        try {
          if (typeof preview.patch === 'string') {
            const parsed = JSON.parse(preview.patch)
            if (Array.isArray(parsed)) return parsed
          }
        } catch {
          /* ignore */
        }
        return preview.patch
      }
      return undefined
    }
    return result
  }, [preview, result])

  const multiResults = useMemo<MultiFileResult[] | undefined>(() => {
    if (Array.isArray(actualData) && actualData.length > 0) return actualData as MultiFileResult[]
    return undefined
  }, [actualData])

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set())
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false)
  useEffect(() => {
    if (hasAutoExpanded || !multiResults || multiResults.length === 0) return
    const uniquePaths = Array.from(
      new Set(multiResults.map((r) => tryString(r.path)).filter((p): p is string => Boolean(p))),
    )
    if (uniquePaths.length === 1) setExpandedPaths(new Set([uniquePaths[0]]))
    setHasAutoExpanded(true)
  }, [multiResults, hasAutoExpanded])

  const togglePath = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  if (resultError) return errorContent(resultError)
  if (preview?.status === 'error') return errorContent(preview.error || 'Preview failed')
  if (preview?.status === 'pending') return spinnerContent()
  if (isInFlight && !multiResults) return spinnerContent()

  const resultsToShow = multiResults ?? []
  if (resultsToShow.length === 0 && !isInFlight) {
    return <div className="text-[11px] text-(--text-secondary)">No files changed</div>
  }
  if (resultsToShow.length === 0) return spinnerContent()

  const grouped = new Map<string, MultiFileResult[]>()
  for (const r of resultsToShow) {
    const path = tryString(r.path) || '(unknown)'
    if (!grouped.has(path)) grouped.set(path, [])
    grouped.get(path)!.push(r)
  }
  const groupsArray = Array.from(grouped.entries())

  return (
    <div className="flex flex-col min-h-0 border border-(--border-subtle) rounded-md overflow-hidden bg-(--surface-base)">
      {groupsArray.map(([path, fileResults]) => {
        const isExpanded = expandedPaths.has(path)
        const combinedPatch = fileResults
          .map((r) => tryString(r.diff) || tryString(r.patch))
          .filter(Boolean)
          .join('\n')
        const anyErr = fileResults.find((r) => tryString(r.error))?.error
        const err = anyErr ? tryString(anyErr) : undefined

        return (
          <div
            key={path}
            className="group flex flex-col border-b last:border-b-0 border-(--border-subtle)"
          >
            <div
              className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs bg-(--surface-overlay) hover:bg-(--surface-raised) cursor-pointer select-none transition-colors"
              onClick={() => togglePath(path)}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <IconChevron
                  className={cn(
                    'w-3.5 h-3.5 text-(--text-muted) transition-transform',
                    isExpanded ? 'rotate-90' : '',
                  )}
                />
                <GitFileStatusIcon status="M" />
                <PathDisplay path={path} />
              </div>
              <div className="grid items-center shrink-0 min-h-[20px] justify-items-end pl-2">
                {err ? (
                  <span className="text-red-500 text-[10px]">Error</span>
                ) : (
                  <GitFileChangesPills patch={combinedPatch} />
                )}
              </div>
            </div>
            {err && !isExpanded ? (
              <div className="text-[10px] text-red-500 px-2 pb-1.5 bg-(--surface-overlay)">
                {err}
              </div>
            ) : null}

            {isExpanded && (
              <div className="flex flex-col bg-(--surface-base) gap-2">
                {fileResults.map((r, i) => {
                  const patch = tryString(r.diff) || tryString(r.patch)
                  const hunkErr = tryString(r.error)
                  if (!patch && !hunkErr) return null
                  return (
                    <div key={i} className="flex flex-col min-h-0">
                      {hunkErr ? <div className="text-xs text-red-500 mb-1">{hunkErr}</div> : null}
                      {patch ? <StructuredUnifiedDiff patch={patch} sideBySide={false} /> : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

type MultiFileResult = {
  path?: string
  diff?: string
  patch?: string
  error?: unknown
}

function spinnerContent(label?: string): ReactNode {
  return (
    <div className="flex items-center justify-center py-4">
      <Spinner label={label ?? 'Loading diff preview…'} />
    </div>
  )
}

function errorContent(message: string): ReactNode {
  return (
    <div className="text-xs text-red-500 py-2 px-1">
      <span className="font-semibold">Error:</span> {message}
    </div>
  )
}
