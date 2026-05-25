import { useMemo, type ReactNode } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

import {
  buildUnifiedDiffIfPresent,
  extract,
  isCompletelyNewFile,
  tryString,
} from '../../../../headless/utils/toolPreview'
import { nativePalette, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import Code from '../../Code'
import UnifiedDiff from '../../git/UnifiedDiff'
import type { ToolCallLike, ToolResultTypeLike } from '../../../../headless/utils/chatTypes'

export type ToolPreview =
  | { status: 'pending' }
  | { status: 'error'; error: string }
  | { status: 'ready'; patch: string }

export type WriteToolsPreviewProps = {
  toolCall: ToolCallLike
  result?: unknown
  resultType?: ToolResultTypeLike
}

/**
 * Native peer of web's `WriteToolsPreview`. Renders the same unified-diff
 * preview for `writeFile` / `writeDiffToFile` / `writeStructuredDiffToFile`
 * — `UnifiedDiff` for proper unified patches, `<Code language="diff">` for
 * everything else.
 */
export function WriteToolsPreview({ toolCall, result, resultType }: WriteToolsPreviewProps) {
  const { theme } = useNativeTheme()
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
    return <ErrorContent message={preview.error || 'Preview failed'} />
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

  if (resultError) return <ErrorContent message={resultError} />

  if (preview?.status === 'pending') return <SpinnerContent label="Loading diff preview…" />

  if (!successPatch) {
    if (isInFlight) return <SpinnerContent label="Loading diff preview…" />
    return (
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>No diff output</Text>
    )
  }

  const isUnified = successPatch.includes('@@')

  if (isNewFile) {
    return (
      <View>
        <Text
          style={{
            marginBottom: nativeSpace[2],
            color: nativePalette.red[600],
            fontWeight: '800',
            fontSize: 16,
            letterSpacing: 0.5,
          }}
        >
          NEW FILE
        </Text>
        <Code code={successPatch} language="diff" />
      </View>
    )
  }

  if (isUnified) {
    // Non-inline UnifiedDiff owns its own scroll, so its `stickyHeaderIndices`
    // can pin each hunk header against that scroll — matching web's
    // `StructuredUnifiedDiff` behaviour. `maxHeight: 9999` is effectively
    // unbounded; the actual height comes from the flex-1 parent the
    // preview sheet provides for single-scroller tools like `writeFile`.
    return <UnifiedDiff patch={successPatch} maxHeight={9999} />
  }

  return <Code code={successPatch} language="diff" />
}

function SpinnerContent({ label }: { label?: string }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ paddingVertical: nativeSpace[3], alignItems: 'center', gap: nativeSpace[2] }}>
      <ActivityIndicator />
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>
        {label ?? 'Loading preview…'}
      </Text>
    </View>
  )
}

function ErrorContent({ message }: { message: string }): ReactNode {
  return (
    <View style={{ paddingVertical: nativeSpace[2], paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 12, color: nativePalette.red[600] }}>
        <Text style={{ fontWeight: '600' }}>Error: </Text>
        {message}
      </Text>
    </View>
  )
}
