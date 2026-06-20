import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import type { IntraMode } from '../../../headless/utils/diffAnnotate'
import UnifiedDiff from './UnifiedDiff'

/**
 * Structural subset of a git text-recovery result this view renders. Kept
 * decoupled from the generated SDK type — the host passes
 * `useGit().recoverTextDiff(...)`, whose result is a superset.
 */
export interface BinaryDiffRecovery {
  recovered: boolean
  patch?: string
  before: { size: number; wasBinary: boolean; reason?: string }
  after: { size: number; wasBinary: boolean; reason?: string }
}

export interface BinaryDiffViewProps {
  path: string
  /** `'binary'` — git flagged binary; `'unparseable'` — patch parsed to no hunks. */
  reason: 'binary' | 'unparseable'
  beforeSize?: number
  afterSize?: number
  /** On-demand recovery (quick fix). Absent ⇒ no recovery affordance. */
  onRecover?: () => Promise<BinaryDiffRecovery>
  /** Persist the fix back to the working tree. Absent ⇒ preview only. */
  onApplyRecovery?: () => void | Promise<void>
  wrap?: boolean
  ignoreWhitespace?: boolean
  intra?: IntraMode
}

function formatBytes(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function reasonLabel(reason?: string): string | null {
  if (reason === 'nul-bytes') return 'contains NUL bytes'
  if (reason === 'invalid-utf8') return 'contains invalid UTF-8'
  return null
}

/**
 * Native peer of web's `BinaryDiffView` — SourceTree-style Before → After byte
 * summary for a file with no text diff, plus an optional in-memory "quick fix"
 * that previews the recovered text diff and (when wired) applies it.
 */
export default function BinaryDiffView({
  path,
  reason,
  beforeSize,
  afterSize,
  onRecover,
  onApplyRecovery,
  wrap,
  ignoreWhitespace,
  intra,
}: BinaryDiffViewProps) {
  const { theme } = useNativeTheme()
  const [recovery, setRecovery] = useState<BinaryDiffRecovery | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Switching files must drop a previous file's recovered preview / error.
  useEffect(() => {
    setRecovery(null)
    setError(null)
    setLoading(false)
    setApplying(false)
  }, [path])

  const runRecover = useCallback(async () => {
    if (!onRecover) return
    setLoading(true)
    setError(null)
    try {
      setRecovery(await onRecover())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [onRecover])

  const runApply = useCallback(async () => {
    if (!onApplyRecovery) return
    setApplying(true)
    setError(null)
    try {
      await onApplyRecovery()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setApplying(false)
    }
  }, [onApplyRecovery])

  const headline =
    reason === 'binary' ? 'Binary file — no text diff' : "Couldn't parse this diff as text"
  const corruptionNote = reasonLabel(recovery?.after.reason) || reasonLabel(recovery?.before.reason)
  const delta =
    typeof beforeSize === 'number' && typeof afterSize === 'number' ? afterSize - beforeSize : undefined

  return (
    <View style={{ padding: nativeSpace[3], gap: nativeSpace[3] }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[2],
          backgroundColor: theme.surface.muted,
          padding: nativeSpace[3],
          gap: nativeSpace[2],
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {headline}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            Before <Text style={{ color: theme.text.primary }}>{formatBytes(beforeSize)}</Text>
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>→</Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            After <Text style={{ color: theme.text.primary }}>{formatBytes(afterSize)}</Text>
          </Text>
          {typeof delta === 'number' && delta !== 0 ? (
            <Text style={{ fontSize: 12, color: delta > 0 ? '#16a34a' : '#dc2626' }}>
              {delta > 0 ? '+' : ''}
              {delta} B
            </Text>
          ) : null}
        </View>

        {onRecover && !recovery ? (
          <Pressable
            onPress={runRecover}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Recover binary file as text"
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              borderWidth: 1,
              borderColor: theme.border.subtle,
              borderRadius: nativeRadii[2],
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[2],
              backgroundColor: pressed ? theme.surface.hover : theme.surface.raised,
              opacity: loading ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 12, color: theme.text.primary }}>
              {loading ? 'Recovering…' : 'Quick fix · recover as text'}
            </Text>
          </Pressable>
        ) : null}

        {error ? <Text style={{ fontSize: 12, color: '#dc2626' }}>{error}</Text> : null}
      </View>

      {recovery && !recovery.recovered ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: nativeRadii[2],
            padding: nativeSpace[3],
          }}
        >
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            This looks like a genuine binary file — it can't be recovered as text.
          </Text>
        </View>
      ) : null}

      {recovery && recovery.recovered ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: nativeRadii[2],
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: nativeSpace[2],
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[2],
              backgroundColor: theme.surface.muted,
              borderBottomWidth: 1,
              borderBottomColor: theme.border.subtle,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.text.secondary, flexShrink: 1 }}>
              Recovered preview (in-memory){corruptionNote ? ` — ${corruptionNote}` : ''}
            </Text>
            {onApplyRecovery ? (
              <Pressable
                onPress={runApply}
                disabled={applying}
                accessibilityRole="button"
                accessibilityLabel="Apply recovery to working tree"
                style={{
                  borderRadius: nativeRadii[2],
                  paddingHorizontal: nativeSpace[2],
                  paddingVertical: 3,
                  backgroundColor: '#16a34a',
                  opacity: applying ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#ffffff' }}>
                  {applying ? 'Applying…' : 'Apply fix'}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {recovery.patch && recovery.patch.trim() ? (
            <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled>
              <UnifiedDiff
                patch={recovery.patch}
                wrap={wrap}
                ignoreWhitespace={ignoreWhitespace}
                intra={intra}
                inline
              />
            </ScrollView>
          ) : (
            <Text style={{ fontSize: 12, color: theme.text.muted, padding: nativeSpace[3] }}>
              No textual differences — only binary/corruption bytes changed in {path}.
            </Text>
          )}
        </View>
      ) : null}
    </View>
  )
}
