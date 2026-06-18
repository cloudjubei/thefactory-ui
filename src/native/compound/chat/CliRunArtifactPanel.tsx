import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { FilesEmittedFilePreview } from '../../../headless/api'
import { useCliRunArtifact } from '../../../headless'
import { nativePalette } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import UnifiedDiff from '../git/UnifiedDiff'

export type CliRunArtifactPanelProps = {
  /** The CLI run whose workspace diff to surface (from the message's `cliRunId`). */
  runId: string
  /** Project whose checkout the diff previews against + applies onto. */
  projectId: string
}

/**
 * Native mirror of web's `CliRunArtifactPanel`. PR-style: the header (file count,
 * expandable) is always shown and a footer with the per-file change chips + the
 * primary action ("Sign off & merge" / "Apply to project") is ALWAYS visible;
 * expanding only reveals the per-file diffs. The diff loads eagerly so the action
 * button reflects real state while collapsed.
 */
export default function CliRunArtifactPanel({ runId, projectId }: CliRunArtifactPanelProps) {
  const { theme } = useNativeTheme()
  const {
    artifact,
    review,
    loading,
    preview,
    previewLoading,
    loadPreview,
    reload,
    apply,
    applying,
    applyResult,
    reviewDiff,
    reviewLoading,
    loadReviewDiff,
    merge,
    merging,
    mergeResult,
    error,
  } = useCliRunArtifact(runId, projectId)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // Eager load (not gated on `expanded`) so the always-visible footer button
    // reflects the real diff state while collapsed.
    if (error) return
    if (review) {
      if (!reviewDiff && !reviewLoading) void loadReviewDiff()
    } else if (artifact && !preview && !previewLoading) {
      void loadPreview()
    }
  }, [review, reviewDiff, reviewLoading, loadReviewDiff, artifact, preview, previewLoading, error, loadPreview])

  if (loading) return null
  // A failed run-fetch must be distinguishable from "the run changed no files".
  if (!artifact && error) {
    return (
      <Text style={{ marginTop: 8, fontSize: 12, color: nativePalette.red[700] }}>
        Failed to load agent changes: {error}{' '}
        <Text style={{ textDecorationLine: 'underline' }} onPress={reload}>
          Retry
        </Text>
      </Text>
    )
  }
  // The panel surfaces the run's workspace changes; nothing to show without an artifact.
  if (!artifact) return null

  const files = artifact.payload.files ?? []
  const counts = {
    added: files.filter((f) => f.status === 'added').length,
    modified: files.filter((f) => f.status === 'modified').length,
    deleted: files.filter((f) => f.status === 'deleted').length,
  }
  const applyResultData = applyResult?.kind === 'files-emitted' ? applyResult : undefined
  const appliedOk =
    !!applyResultData &&
    applyResultData.errors.length === 0 &&
    applyResultData.added.length + applyResultData.modified.length + applyResultData.deleted.length >
      0
  const isApplied = appliedOk || artifact.appliedAt != null
  const isMerged = mergeResult?.ok === true || review?.mergedAt != null
  const conflictCount = preview?.files.filter((f) => f.conflict).length ?? 0

  const statusColor = (file: FilesEmittedFilePreview): string =>
    file.status === 'added'
      ? nativePalette.green[700]
      : file.status === 'deleted'
        ? nativePalette.red[700]
        : nativePalette.orange[700]

  const chip = (label: string, color: string, bg: string) => (
    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: bg }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
    </View>
  )

  return (
    <View
      style={{
        marginTop: 8,
        borderWidth: 1,
        borderColor: theme.border.default,
        borderRadius: 8,
        backgroundColor: theme.surface.raised,
        overflow: 'hidden',
      }}
    >
      {/* Header — always visible; toggles the per-file diffs. */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 8,
        }}
      >
        <Text
          style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary, flexShrink: 1 }}
          numberOfLines={1}
        >
          {`Agent changed ${files.length} file${files.length === 1 ? '' : 's'}`}
          {review ? `  ${review.branch} ← ${review.baseSha.slice(0, 8)}` : ''}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{expanded ? '▾' : '▸'}</Text>
      </Pressable>

      {/* Expanded — per-file unified diffs only. */}
      {expanded ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
            paddingHorizontal: 12,
            paddingVertical: 8,
            gap: 12,
          }}
        >
          {error ? (
            <Text style={{ fontSize: 12, color: nativePalette.red[700] }}>
              {error}{' '}
              {review && !reviewDiff && !reviewLoading ? (
                <Text style={{ textDecorationLine: 'underline' }} onPress={() => void loadReviewDiff()}>
                  Retry
                </Text>
              ) : !review && !preview && !previewLoading ? (
                <Text style={{ textDecorationLine: 'underline' }} onPress={() => void loadPreview()}>
                  Retry
                </Text>
              ) : null}
            </Text>
          ) : null}
          {review && reviewLoading ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>Loading diff…</Text>
          ) : null}
          {!review && previewLoading ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>Computing diff…</Text>
          ) : null}

          {review
            ? (reviewDiff?.files ?? []).map((file) => (
                <View key={file.path} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      style={{ fontSize: 12, color: theme.text.primary, flexShrink: 1 }}
                      numberOfLines={1}
                    >
                      {file.path}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: theme.text.secondary }}>
                      {file.status}
                    </Text>
                  </View>
                  {file.patch ? (
                    <UnifiedDiff patch={file.patch} />
                  ) : (
                    <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                      {file.binary ? 'Binary file.' : 'No textual diff.'}
                    </Text>
                  )}
                </View>
              ))
            : (preview?.files ?? []).map((file) => (
                <View key={file.path} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      style={{ fontSize: 12, color: theme.text.primary, flexShrink: 1 }}
                      numberOfLines={1}
                    >
                      {file.path}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: statusColor(file) }}>
                      {file.status}
                    </Text>
                    {file.conflict && !isApplied ? (
                      <Text style={{ fontSize: 11, fontWeight: '500', color: nativePalette.red[700] }}>
                        conflict
                      </Text>
                    ) : null}
                  </View>
                  {file.patch ? (
                    <UnifiedDiff patch={file.patch} />
                  ) : (
                    <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                      {file.unsafePath
                        ? 'Unsafe path — will not be applied.'
                        : file.contentUnavailable
                          ? 'Binary or oversized content — cannot be applied from the artifact.'
                          : file.unchanged
                            ? 'No changes — already applied.'
                            : ''}
                    </Text>
                  )}
                </View>
              ))}
        </View>
      ) : null}

      {/* Footer — always visible: change chips + status + the primary action. */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
          paddingHorizontal: 12,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {counts.added > 0 ? chip(`+${counts.added}`, nativePalette.green[700], 'rgba(34,197,94,0.12)') : null}
            {counts.modified > 0 ? chip(`~${counts.modified}`, nativePalette.orange[700], 'rgba(249,115,22,0.12)') : null}
            {counts.deleted > 0 ? chip(`−${counts.deleted}`, nativePalette.red[700], 'rgba(239,68,68,0.12)') : null}
          </View>
          {review ? (
            mergeResult?.conflicts && mergeResult.conflicts.length > 0 ? (
              <Text style={{ fontSize: 12, color: nativePalette.red[700], flexShrink: 1 }} numberOfLines={1}>
                {mergeResult.conflicts.length} conflict
                {mergeResult.conflicts.length === 1 ? '' : 's'} — resolve in the Git tab
              </Text>
            ) : mergeResult && !mergeResult.ok ? (
              <Text style={{ fontSize: 12, color: nativePalette.red[700], flexShrink: 1 }} numberOfLines={1}>
                {mergeResult.message ?? 'Merge failed'}
              </Text>
            ) : isMerged ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary, flexShrink: 1 }} numberOfLines={1}>
                Merged into your branch
              </Text>
            ) : null
          ) : applyResultData ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary, flexShrink: 1 }} numberOfLines={1}>
              {applyResultData.added.length} added, {applyResultData.modified.length} modified,{' '}
              {applyResultData.deleted.length} deleted
            </Text>
          ) : conflictCount > 0 && !isApplied ? (
            <Text style={{ fontSize: 12, color: nativePalette.red[700], flexShrink: 1 }} numberOfLines={1}>
              {conflictCount} conflict{conflictCount === 1 ? '' : 's'} — overwrites local edits
            </Text>
          ) : isApplied ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary, flexShrink: 1 }} numberOfLines={1}>
              Applied to project
            </Text>
          ) : null}
        </View>

        {review ? (
          <Pressable
            onPress={() => void merge()}
            disabled={merging || isMerged || !reviewDiff}
            accessibilityRole="button"
            accessibilityState={{ disabled: merging || isMerged || !reviewDiff, busy: merging }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: theme.accent.primary,
              opacity: merging || isMerged || !reviewDiff ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.inverted }}>
              {merging ? 'Merging…' : isMerged ? 'Merged ✓' : 'Sign off & merge'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void apply()}
            disabled={applying || isApplied || !preview}
            accessibilityRole="button"
            accessibilityState={{ disabled: applying || isApplied || !preview, busy: applying }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: theme.accent.primary,
              opacity: applying || isApplied || !preview ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.inverted }}>
              {applying ? 'Applying…' : isApplied ? 'Applied' : 'Apply to project'}
            </Text>
          </Pressable>
        )}
      </View>

      {applyResultData && applyResultData.errors.length > 0 ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          {applyResultData.errors.map((e) => (
            <Text key={e.path} style={{ fontSize: 12, color: nativePalette.red[700] }}>
              {e.path}: {e.reason}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}
