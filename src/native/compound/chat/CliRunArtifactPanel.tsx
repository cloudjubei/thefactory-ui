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
 * Native mirror of web's `CliRunArtifactPanel`: a collapsible panel under a CLI
 * agent's reply listing every file the run changed, each rendered as a unified
 * diff against the project's current checkout (with a conflict badge when the
 * file diverged since the run), and an Apply button that materialises the
 * changes onto the checkout. Apply stays disabled until the preview has loaded
 * — applying sight-unseen would bypass the conflict check.
 */
export default function CliRunArtifactPanel({ runId, projectId }: CliRunArtifactPanelProps) {
  const { theme } = useNativeTheme()
  const {
    artifact,
    loading,
    preview,
    previewLoading,
    loadPreview,
    reload,
    apply,
    applying,
    applyResult,
    error,
  } = useCliRunArtifact(runId, projectId)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // `error` gates the retry: without it a failing preview refires forever
    // (each failure resets previewLoading with preview still unset).
    if (expanded && !preview && !previewLoading && !error) void loadPreview()
  }, [expanded, preview, previewLoading, error, loadPreview])

  if (loading) return null
  if (!artifact) {
    // A failed run-fetch must be distinguishable from "the run changed no files".
    return error ? (
      <Text style={{ marginTop: 8, fontSize: 12, color: nativePalette.red[700] }}>
        Failed to load agent changes: {error}{' '}
        <Text style={{ textDecorationLine: 'underline' }} onPress={reload}>
          Retry
        </Text>
      </Text>
    ) : null
  }

  const files = artifact.payload.files
  const counts = {
    added: files.filter((f) => f.status === 'added').length,
    modified: files.filter((f) => f.status === 'modified').length,
    deleted: files.filter((f) => f.status === 'deleted').length,
  }
  const applyResultData = applyResult?.kind === 'files-emitted' ? applyResult : undefined
  // "Applied" means the change actually landed (mirrors web): a fresh apply with
  // no errors that materialised ≥1 file, OR the durable `appliedAt` from the run
  // record. A failed apply stays retryable.
  const appliedOk =
    !!applyResultData &&
    applyResultData.errors.length === 0 &&
    applyResultData.added.length + applyResultData.modified.length + applyResultData.deleted.length >
      0
  const isApplied = appliedOk || artifact.appliedAt != null
  const conflictCount = preview?.files.filter((f) => f.conflict).length ?? 0

  const statusColor = (file: FilesEmittedFilePreview): string =>
    file.status === 'added'
      ? nativePalette.green[700]
      : file.status === 'deleted'
        ? nativePalette.red[700]
        : nativePalette.orange[700]

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
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
          Agent changed {files.length} file{files.length === 1 ? '' : 's'}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          {counts.added > 0 ? `+${counts.added} ` : ''}
          {counts.modified > 0 ? `~${counts.modified} ` : ''}
          {counts.deleted > 0 ? `−${counts.deleted} ` : ''}
          {expanded ? '▾' : '▸'}
        </Text>
      </Pressable>

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
              {!preview && !previewLoading ? (
                <Text
                  style={{ textDecorationLine: 'underline' }}
                  onPress={() => void loadPreview()}
                >
                  Retry
                </Text>
              ) : null}
            </Text>
          ) : null}
          {previewLoading ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>Computing diff…</Text>
          ) : null}

          {(preview?.files ?? []).map((file) => (
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

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
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
            {conflictCount > 0 && !isApplied ? (
              <Text style={{ fontSize: 12, color: nativePalette.red[700], flexShrink: 1 }}>
                {conflictCount} conflict{conflictCount === 1 ? '' : 's'} — applying overwrites
                local edits
              </Text>
            ) : null}
            {applyResultData ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary, flexShrink: 1 }}>
                {applyResultData.added.length} added, {applyResultData.modified.length} modified,{' '}
                {applyResultData.deleted.length} deleted
                {applyResultData.errors.length > 0 ? `, ${applyResultData.errors.length} failed` : ''}
              </Text>
            ) : isApplied ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary, flexShrink: 1 }}>
                Applied to project
              </Text>
            ) : null}
          </View>
          {applyResultData && applyResultData.errors.length > 0
            ? applyResultData.errors.map((e) => (
                <Text key={e.path} style={{ fontSize: 12, color: nativePalette.red[700] }}>
                  {e.path}: {e.reason}
                </Text>
              ))
            : null}
        </View>
      ) : null}
    </View>
  )
}
