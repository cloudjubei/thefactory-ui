import { useMemo, type ReactNode } from 'react'
import Code from '../../Code'
import Spinner from '../../../primitives/Spinner'
import { StructuredUnifiedDiff } from '../../diff/diffUtils'
import type { ToolCall, ToolResultType } from '../ToolCall'
import { buildUnifiedDiffIfPresent, extract, isCompletelyNewFile, tryString } from './utils'

export type ToolPreview =
  | { status: 'pending' }
  | { status: 'error'; error: string }
  | { status: 'ready'; patch: string }

export type WriteToolsPreviewProps = {
  toolCall: ToolCall
  result?: unknown
  resultType?: ToolResultType
  sideBySide: boolean
}

/**
 * Hover-card preview for single-file write tools (`writeFile`,
 * `writeDiffToFile`, `writeStructuredDiffToFile`). Renders a
 * `StructuredUnifiedDiff` when the result has a unified patch, falls back
 * to a `Code` block otherwise. Shows a banner when the file is brand-new.
 *
 * Lifted from `overseer-local`'s `WriteToolsPreview` so both apps share
 * the same rendering surface.
 */
export function WriteToolsPreview({
  toolCall,
  result,
  resultType,
  sideBySide,
}: WriteToolsPreviewProps) {
  const toolName = String(toolCall?.name)
  const isInFlight =
    resultType === 'pending' || resultType === 'running' || resultType === 'require_confirmation'

  const resultError = useMemo(() => {
    if (resultType === 'errored') {
      return (
        tryString(extract(result, ['message']) || extract(result, ['error']) || result) ||
        'Tool errored'
      )
    }
    const err = extract(result, ['error']) as { message?: string } | string | undefined
    if (err) return typeof err === 'string' ? err : tryString(err.message ?? err)
    return undefined
  }, [result, resultType])

  const isPreviewObject = !!(result && typeof result === 'object' && 'status' in (result as object))
  const preview = isPreviewObject ? (result as ToolPreview) : undefined

  if (preview?.status === 'error') {
    return errorContent(preview.error || 'Preview failed')
  }

  const actualData = useMemo(() => {
    if (preview) {
      if (preview.status === 'ready') {
        try {
          if (typeof preview.patch === 'string' && toolName === 'writeExactReplaces') {
            const parsed = JSON.parse(preview.patch)
            if (Array.isArray(parsed)) return parsed
          }
        } catch {
          // ignore
        }
        return preview.patch
      }
      return undefined
    }
    return result
  }, [preview, result, toolName])

  const successPatch = useMemo(() => {
    if (Array.isArray(actualData)) {
      const patches = actualData
        .map((r) => buildUnifiedDiffIfPresent(r) || tryString(extract(r, ['diff', 'patch'])))
        .filter((p): p is string => typeof p === 'string' && p.length > 0)
      if (patches.length > 0) return patches.join('\n')
    }
    const single = buildUnifiedDiffIfPresent(actualData)
    if (single) return single
    if (typeof actualData === 'string') return actualData
    return undefined
  }, [actualData])

  const isNewFile = toolName === 'writeFile' ? isCompletelyNewFile(actualData, successPatch) : false

  if (resultError) return errorContent(resultError)

  if (preview?.status === 'pending') return spinnerContent('Loading diff preview…')

  if (!successPatch) {
    if (isInFlight) return spinnerContent('Loading diff preview…')
    return <div className="text-[11px] text-(--text-secondary)">No diff output</div>
  }

  const isUnified = successPatch.includes('@@')

  if (isNewFile) {
    return (
      <div>
        <div className="mb-2 text-red-500 font-extrabold text-lg tracking-wide">NEW FILE</div>
        <Code code={successPatch} language="diff" />
      </div>
    )
  }

  if (isUnified) {
    return <StructuredUnifiedDiff patch={successPatch} sideBySide={sideBySide} />
  }

  return <Code code={successPatch} language="diff" />
}

function spinnerContent(label?: string): ReactNode {
  return (
    <div className="flex items-center justify-center py-4">
      <Spinner label={label ?? 'Loading preview…'} />
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
