import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { FilesEmittedFilePreview } from '../../../headless/api'
import {
  isReviewReasonValid,
  landFailureSummary,
  mergeNotice,
  reviewActionMode,
  reviewChangeCounts,
  runReviewFacts,
  verdictSummary,
  verificationCheckRows,
  verificationHeadline,
  useCliRunArtifact,
  type ReviewCheckRow,
  type ReviewTone,
  formatChangeRequestMessage,
} from '../../../headless'
import { nativePalette } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Input } from '../../primitives/Input'
import UnifiedDiff from '../git/UnifiedDiff'

export type CliRunArtifactPanelProps = {
  /** The CLI run whose workspace diff to surface (from the message's `cliRunId`). */
  runId: string
  /** Project whose checkout the diff previews against + applies onto. */
  projectId: string
  /**
   * Sends a message into the chat this panel sits in.
   *
   * Wired so "Request changes" reaches the AGENT and not just the run record:
   * the notes are the whole point of the action, and a verdict nobody is told
   * about cannot produce the change the user asked for.
   */
  onSendMessage?: (text: string) => void | Promise<void>
}

const TONE_FG: Record<ReviewTone, string | undefined> = {
  positive: nativePalette.green[700],
  warning: nativePalette.orange[700],
  danger: nativePalette.red[700],
  neutral: undefined,
}

const TONE_BG: Record<ReviewTone, string> = {
  positive: 'rgba(34,197,94,0.12)',
  warning: 'rgba(249,115,22,0.12)',
  danger: 'rgba(239,68,68,0.12)',
  neutral: 'transparent',
}

const TONE_BORDER: Record<ReviewTone, string> = {
  positive: 'rgba(34,197,94,0.25)',
  warning: 'rgba(249,115,22,0.25)',
  danger: 'rgba(239,68,68,0.25)',
  neutral: 'transparent',
}

function CheckRow({ row }: { row: ReviewCheckRow }) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const fg = TONE_FG[row.tone] ?? theme.text.secondary
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <View
        style={{
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: TONE_BORDER[row.tone],
          backgroundColor: TONE_BG[row.tone],
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: '600', color: fg }}>{row.status}</Text>
      </View>
      <View style={{ flexShrink: 1, flexGrow: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
            {row.label}
          </Text>
          {row.optional ? (
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>optional</Text>
          ) : null}
          {row.durationLabel ? (
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>{row.durationLabel}</Text>
          ) : null}
        </View>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{row.summary}</Text>
        {row.details ? (
          <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button">
            <Text
              style={{ fontSize: 11, color: theme.text.secondary, textDecorationLine: 'underline' }}
            >
              {open ? 'Hide output' : 'Show output'}
            </Text>
          </Pressable>
        ) : null}
        {open && row.details ? (
          <View
            style={{
              borderRadius: 6,
              backgroundColor: theme.surface.muted,
              paddingHorizontal: 8,
              paddingVertical: 6,
            }}
          >
            <Text style={{ fontSize: 11, fontFamily: 'Menlo', color: theme.text.secondary }}>
              {row.details}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

/**
 * Native mirror of web's `CliRunArtifactPanel`. PR-style: an always-visible
 * summary head (what changed, verification evidence, cost + duration) sits above
 * the diff and a footer carries the review decision — Approve & merge / Request
 * changes / Reject in review mode, "Apply to project" on the no-git path.
 * Expanding only reveals the per-file diffs; the diff loads eagerly so the
 * action row reflects real state while collapsed.
 */
export default function CliRunArtifactPanel({ runId, projectId,
  onSendMessage,
}: CliRunArtifactPanelProps) {
  const { theme } = useNativeTheme()
  const {
    artifact,
    review,
    verification,
    verdict,
    landFailure,
    costUSD,
    durationMs,
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
    verify,
    verifying,
    reject,
    rejecting,
    requestChanges,
    requestingChanges,
    error,
  } = useCliRunArtifact(runId, projectId)
  const [expanded, setExpanded] = useState(false)
  const [reasonFor, setReasonFor] = useState<'rejected' | 'changes-requested' | undefined>(
    undefined,
  )
  const [reason, setReason] = useState('')

  useEffect(() => {
    // Eager load (not gated on `expanded`) so the always-visible action row
    // reflects the real diff state while collapsed.
    if (error) return
    if (review) {
      if (!reviewDiff && !reviewLoading) void loadReviewDiff()
    } else if (artifact && !preview && !previewLoading) {
      void loadPreview()
    }
  }, [
    review,
    reviewDiff,
    reviewLoading,
    loadReviewDiff,
    artifact,
    preview,
    previewLoading,
    error,
    loadPreview,
  ])

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
  // The panel surfaces the run's workspace changes; nothing to show without an
  // artifact — unless the run tried and failed to land them, which the user must
  // still be told about.
  if (!artifact && !landFailure) return null

  const files = artifact?.payload.files ?? []
  const counts = reviewChangeCounts(files)
  const applyResultData = applyResult?.kind === 'files-emitted' ? applyResult : undefined
  const appliedOk =
    !!applyResultData &&
    applyResultData.errors.length === 0 &&
    applyResultData.added.length +
      applyResultData.modified.length +
      applyResultData.deleted.length >
      0
  const isApplied = appliedOk || artifact?.appliedAt != null
  const isMerged = mergeResult?.ok === true || review?.mergedAt != null
  const conflictCount = preview?.files.filter((f) => f.conflict).length ?? 0

  const head = verificationHeadline(verification)
  const checkRows = verificationCheckRows(verification)
  const facts = runReviewFacts({ costUSD, durationMs })
  const notice = mergeNotice(mergeResult)
  const decided = verdict ? verdictSummary(verdict) : undefined
  const landing = landFailure ? landFailureSummary(landFailure) : undefined
  const actionMode = reviewActionMode({ verdict, hasReviewBranch: !!review })
  const busy = merging || rejecting || requestingChanges
  const reasonValid = isReviewReasonValid(reason)

  const openReason = (decision: 'rejected' | 'changes-requested') => {
    setReasonFor(decision)
    setReason('')
  }

  const submitReason = () => {
    if (!reasonFor || !reasonValid) return
    const decision = reasonFor
    const text = reason
    setReasonFor(undefined)
    setReason('')
    if (decision === 'rejected') {
      void reject(text)
      return
    }
    // Record the verdict AND send the notes to the agent. Recording alone left
    // the user waiting on a message nobody had sent.
    void (async () => {
      await requestChanges(text)
      const message = formatChangeRequestMessage(text)
      if (message !== undefined) await onSendMessage?.(message)
    })()
  }

  const statusColor = (file: FilesEmittedFilePreview): string =>
    file.status === 'added'
      ? nativePalette.green[700]
      : file.status === 'deleted'
        ? nativePalette.red[700]
        : nativePalette.orange[700]

  const chip = (label: string, color: string, bg: string) => (
    <View
      style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: bg }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
    </View>
  )

  const secondaryButton = (
    label: string,
    onPress: () => void,
    opts: { disabled?: boolean; tone?: ReviewTone } = {},
  ) => {
    const tone = opts.tone ?? 'neutral'
    const fg = TONE_FG[tone] ?? theme.text.secondary
    return (
      <Pressable
        onPress={onPress}
        disabled={opts.disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!opts.disabled }}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: tone === 'neutral' ? theme.border.default : TONE_BORDER[tone],
          opacity: opts.disabled ? 0.5 : 1,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '500', color: fg }}>{label}</Text>
      </Pressable>
    )
  }

  const primaryButton = (
    label: string,
    onPress: () => void,
    disabled: boolean,
    busyNow: boolean,
  ) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: busyNow }}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: theme.accent.primary,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.inverted }}>{label}</Text>
    </Pressable>
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
          {artifact
            ? `Agent changed ${files.length} file${files.length === 1 ? '' : 's'}`
            : 'Agent changes were not landed'}
          {review ? `  ${review.branch} ← ${review.baseSha.slice(0, 8)}` : ''}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{expanded ? '▾' : '▸'}</Text>
      </Pressable>

      {/* Summary head — always visible: what changed, what it cost, what the
          checks say. The evidence a reviewer needs before deciding. */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {counts.added > 0
            ? chip(`+${counts.added}`, nativePalette.green[700], TONE_BG.positive)
            : null}
          {counts.modified > 0
            ? chip(`~${counts.modified}`, nativePalette.orange[700], TONE_BG.warning)
            : null}
          {counts.deleted > 0
            ? chip(`−${counts.deleted}`, nativePalette.red[700], TONE_BG.danger)
            : null}
          {facts.costLabel ? (
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>{facts.costLabel}</Text>
          ) : null}
          {facts.durationLabel ? (
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>{facts.durationLabel}</Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: TONE_BORDER[head.tone],
              backgroundColor: TONE_BG[head.tone],
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: TONE_FG[head.tone] ?? theme.text.secondary,
              }}
            >
              {head.label}
            </Text>
          </View>
          <Text
            style={{ fontSize: 11, color: theme.text.secondary, flexShrink: 1 }}
            numberOfLines={2}
          >
            {head.detail}
          </Text>
          {head.durationLabel ? (
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>
              {`in ${head.durationLabel}`}
            </Text>
          ) : null}
          <Pressable
            onPress={() => void verify()}
            disabled={verifying}
            accessibilityRole="button"
            accessibilityState={{ disabled: verifying, busy: verifying }}
            style={{ marginLeft: 'auto', opacity: verifying ? 0.5 : 1 }}
          >
            <Text
              style={{ fontSize: 11, color: theme.text.secondary, textDecorationLine: 'underline' }}
            >
              {verifying ? 'Running checks…' : 'Re-run checks'}
            </Text>
          </Pressable>
        </View>

        {checkRows.length > 0 ? (
          <View style={{ gap: 6 }}>
            {checkRows.map((row) => (
              <CheckRow key={row.id} row={row} />
            ))}
          </View>
        ) : null}

        {landing ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: TONE_BORDER.warning,
              backgroundColor: TONE_BG.warning,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 6,
              gap: 2,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: nativePalette.orange[700] }}>
              {landing.title}
            </Text>
            <Text style={{ fontSize: 12, color: nativePalette.orange[700] }}>
              {`The agent produced changes but they were not committed to a review branch — ${landing.message}.`}
            </Text>
          </View>
        ) : null}
      </View>

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
                <Text
                  style={{ textDecorationLine: 'underline' }}
                  onPress={() => void loadReviewDiff()}
                >
                  Retry
                </Text>
              ) : !review && !preview && !previewLoading ? (
                <Text
                  style={{ textDecorationLine: 'underline' }}
                  onPress={() => void loadPreview()}
                >
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
                      <Text
                        style={{ fontSize: 11, fontWeight: '500', color: nativePalette.red[700] }}
                      >
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

      {/* Footer — always visible: outcome message + the review decision. */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 8,
        }}
      >
        {decided ? (
          <View style={{ gap: 2 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: TONE_FG[decided.tone] ?? theme.text.secondary,
              }}
            >
              {`${decided.label} by ${decided.byLabel}`}
            </Text>
            {decided.notes ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>{decided.notes}</Text>
            ) : null}
          </View>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <View style={{ flexShrink: 1 }}>
              {notice ? (
                <Text
                  style={{ fontSize: 12, color: TONE_FG[notice.tone] ?? theme.text.secondary }}
                  numberOfLines={2}
                >
                  {notice.message}
                </Text>
              ) : actionMode === 'actions' && isMerged ? (
                <Text style={{ fontSize: 12, color: theme.text.secondary }} numberOfLines={1}>
                  Merged into your branch
                </Text>
              ) : applyResultData ? (
                <Text style={{ fontSize: 12, color: theme.text.secondary }} numberOfLines={1}>
                  {applyResultData.added.length} added, {applyResultData.modified.length} modified,{' '}
                  {applyResultData.deleted.length} deleted
                </Text>
              ) : conflictCount > 0 && !isApplied ? (
                <Text style={{ fontSize: 12, color: nativePalette.red[700] }} numberOfLines={1}>
                  {conflictCount} conflict{conflictCount === 1 ? '' : 's'} — overwrites local edits
                </Text>
              ) : isApplied ? (
                <Text style={{ fontSize: 12, color: theme.text.secondary }} numberOfLines={1}>
                  Applied to project
                </Text>
              ) : null}
            </View>

            {actionMode === 'actions' ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
              >
                {secondaryButton(
                  requestingChanges ? 'Sending…' : 'Request changes',
                  () => openReason('changes-requested'),
                  { disabled: busy || isMerged },
                )}
                {secondaryButton(
                  rejecting ? 'Rejecting…' : 'Reject',
                  () => openReason('rejected'),
                  {
                    disabled: busy || isMerged,
                    tone: 'danger',
                  },
                )}
                {primaryButton(
                  merging ? 'Merging…' : isMerged ? 'Merged ✓' : 'Approve & merge',
                  () => void merge(),
                  busy || isMerged || !reviewDiff,
                  merging,
                )}
              </View>
            ) : actionMode === 'none' && artifact ? (
              primaryButton(
                applying ? 'Applying…' : isApplied ? 'Applied' : 'Apply to project',
                () => void apply(),
                applying || isApplied || !preview,
                applying,
              )
            ) : null}
          </View>
        )}

        {reasonFor ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Input
              size="sm"
              autoFocus
              value={reason}
              placeholder={
                reasonFor === 'rejected' ? 'Why is this rejected?' : 'What needs to change?'
              }
              onChangeText={setReason}
              onSubmitEditing={submitReason}
              style={{ flexGrow: 1, flexShrink: 1 }}
            />
            {primaryButton(
              reasonFor === 'rejected' ? 'Reject' : 'Send',
              submitReason,
              !reasonValid || busy,
              busy,
            )}
            {secondaryButton('Cancel', () => setReasonFor(undefined))}
          </View>
        ) : null}
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
