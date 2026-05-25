import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { tryString } from '../../../../headless/utils/toolPreview'
import {
  nativePalette,
  nativeRadii,
  nativeSpace,
} from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconChevron } from '../../../icons'
import { PathDisplay } from '../../PathDisplay'
import { GitFileChangesPills } from '../../git/GitFileChangesPills'
import GitFileStatusIcon from '../../git/GitFileStatusIcon'
import UnifiedDiff from '../../git/UnifiedDiff'
import type { ToolCallLike, ToolResultTypeLike } from '../../../../headless/utils/chatTypes'

export type WriteMultiToolsPreviewProps = {
  toolCall: ToolCallLike
  result?: unknown
  resultType?: ToolResultTypeLike
}

type MultiFileResult = {
  path?: string
  diff?: string
  patch?: string
  error?: unknown
}

/**
 * Native peer of web's `WriteMultiToolsPreview`. Groups `writeExactReplaces`
 * results by path with expand/collapse + per-file `UnifiedDiff` body.
 */
export function WriteMultiToolsPreview({
  toolCall: _toolCall,
  result,
  resultType,
}: WriteMultiToolsPreviewProps) {
  const { theme } = useNativeTheme()
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

  if (resultError) return <ErrorContent message={resultError} />
  if (preview?.status === 'error') return <ErrorContent message={preview.error || 'Preview failed'} />
  if (preview?.status === 'pending') return <SpinnerContent />
  if (isInFlight && !multiResults) return <SpinnerContent />

  const resultsToShow = multiResults ?? []
  if (resultsToShow.length === 0 && !isInFlight) {
    return (
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>No files changed</Text>
    )
  }
  if (resultsToShow.length === 0) return <SpinnerContent />

  const grouped = new Map<string, MultiFileResult[]>()
  for (const r of resultsToShow) {
    const path = tryString(r.path) || '(unknown)'
    if (!grouped.has(path)) grouped.set(path, [])
    grouped.get(path)!.push(r)
  }
  const groupsArray = Array.from(grouped.entries())

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.base,
        overflow: 'hidden',
      }}
    >
      {groupsArray.map(([path, fileResults], groupIdx) => {
        const isExpanded = expandedPaths.has(path)
        const anyErr = fileResults.find((r) => tryString(r.error))?.error
        const err = anyErr ? tryString(anyErr) : undefined
        const isLast = groupIdx === groupsArray.length - 1
        const combinedPatch = fileResults
          .map((r) => tryString(r.diff) || tryString(r.patch))
          .filter((p): p is string => Boolean(p))
          .join('\n')
        return (
          <View
            key={path}
            style={{
              borderBottomWidth: isLast ? 0 : 1,
              borderBottomColor: theme.border.subtle,
            }}
          >
            <Pressable
              onPress={() => togglePath(path)}
              style={({ pressed }) => ({
                paddingHorizontal: nativeSpace[2],
                paddingVertical: 6,
                backgroundColor: pressed
                  ? theme.surface.raised
                  : theme.surface.overlay,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
                <View style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}>
                  <IconChevron size={14} color={theme.text.muted} />
                </View>
                <GitFileStatusIcon status="M" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <PathDisplay path={path} />
                </View>
                {err ? (
                  <Text style={{ fontSize: 10, color: nativePalette.red[600] }}>Error</Text>
                ) : (
                  <GitFileChangesPills patch={combinedPatch} />
                )}
              </View>
            </Pressable>
            {err && !isExpanded ? (
              <View
                style={{
                  paddingHorizontal: nativeSpace[2],
                  paddingBottom: 6,
                  backgroundColor: theme.surface.overlay,
                }}
              >
                <Text style={{ fontSize: 10, color: nativePalette.red[600] }}>{err}</Text>
              </View>
            ) : null}
            {isExpanded ? (
              <View
                style={{
                  // Hunks render flush with the file-row chrome — matches
                  // web's `WriteMultiToolsPreview` where the expanded body
                  // has no extra padding around `StructuredUnifiedDiff`.
                  gap: nativeSpace[2],
                  backgroundColor: theme.surface.base,
                }}
              >
                {fileResults.map((r, i) => {
                  const patch = tryString(r.diff) || tryString(r.patch)
                  const hunkErr = tryString(r.error)
                  if (!patch && !hunkErr) return null
                  return (
                    <View key={i}>
                      {hunkErr ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: nativePalette.red[600],
                            marginBottom: 4,
                          }}
                        >
                          {hunkErr}
                        </Text>
                      ) : null}
                      {patch ? <UnifiedDiff patch={patch} inline /> : null}
                    </View>
                  )
                })}
              </View>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

function SpinnerContent({ label }: { label?: string }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ paddingVertical: nativeSpace[3], alignItems: 'center', gap: nativeSpace[2] }}>
      <ActivityIndicator />
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>
        {label ?? 'Loading diff preview…'}
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
