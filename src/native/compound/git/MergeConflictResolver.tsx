import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useActiveProject, useGit } from '../../../headless'
import {
  hasConflictMarkers,
  parseConflictSegments,
  resolveConflict,
  serializeSegments,
  type BothOrder,
  type Segment,
} from '../../../headless/utils/conflictMarkers'
import { readFile as readFileSdk, writeFile as writeFileSdk } from '../../../headless/api'
import type { GitConflictEntry } from '../../../headless/api'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronDown, IconChevronRight } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import SegmentedControl from '../../primitives/SegmentedControl'
import Spinner from '../../primitives/Spinner'
import { Textarea } from '../../primitives/Textarea'

export type MergeConflictResolverProps = {
  isOpen: boolean
  onClose: () => void
  /** Ref for the "ours" side context pane — typically `HEAD`. */
  baseRef: string
  /** Current / incoming branch name — used as the merge commit message label
   *  and as the "theirs" ref when loading parent content (matches web). */
  branch: string
  conflicts: GitConflictEntry[]
  /** The conflicted file to open first; defaults to the first one. */
  initialPath?: string
}

const BOTH_ORDER_OPTIONS = [
  { value: 'ours-then-theirs', label: 'ours → theirs' },
  { value: 'theirs-then-ours', label: 'theirs → ours' },
] as const

/**
 * Native peer of web's `MergeConflictResolver` — same public API, touch-
 * rendered. Per conflicted file it parses git's conflict markers (via the
 * shared headless helpers) into ours/theirs hunks, lets the user pick a
 * side per hunk (or accept all, or hand-edit the result), then writes +
 * stages the resolved file. Conflict context is stacked panes (no
 * side-by-side — there's no horizontal room on phone) and per-hunk choices
 * use the touch `SegmentedControl` rather than hover-revealed buttons.
 */
export default function MergeConflictResolver({
  isOpen,
  onClose,
  baseRef,
  branch,
  conflicts,
  initialPath,
}: MergeConflictResolverProps) {
  const { projectId } = useActiveProject()
  const { stage, commit, push, resetAll, abortMerge, getFileContent, status } = useGit()
  const mergeMessage = status?.merging?.message
  const firstPath = initialPath ?? conflicts[0]?.path ?? null

  const [selected, setSelected] = useState<string | null>(firstPath)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [segments, setSegments] = useState<Segment[]>([])
  const [dirty, setDirty] = useState(false)
  const [manualEdit, setManualEdit] = useState(false)

  const [oursText, setOursText] = useState('')
  const [theirsText, setTheirsText] = useState('')
  const [triplesLoading, setTriplesLoading] = useState(false)

  const [resolvedMap, setResolvedMap] = useState<Record<string, boolean>>({})
  const [bothOrder, setBothOrder] = useState<BothOrder>('ours-then-theirs')

  const [aborting, setAborting] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [finalizeMsg, setFinalizeMsg] = useState(`Merge branch ${branch}`)
  const [pushImmediately, setPushImmediately] = useState(false)

  const originalByPathRef = useRef<Record<string, string>>({})

  const isBinary = useMemo(() => {
    const c = conflicts.find((entry) => entry.path === selected)
    return c?.type ? /binary/i.test(String(c.type)) : false
  }, [conflicts, selected])

  const unresolvedCount = useMemo(
    () => segments.filter((s) => s.type === 'conflict').length,
    [segments],
  )
  const totalFiles = conflicts.length
  const resolvedCount = useMemo(
    () => conflicts.filter((c) => resolvedMap[c.path]).length,
    [conflicts, resolvedMap],
  )
  const allResolved = totalFiles > 0 && resolvedCount === totalFiles

  const loadFile = useCallback(
    async (path: string | null) => {
      if (!path || !projectId) return
      setLoading(true)
      setError(null)
      try {
        const { data } = await readFileSdk({
          path: { projectId },
          body: { path },
          throwOnError: true,
        })
        const raw = data.content ?? ''
        setContent(raw)
        setSegments(parseConflictSegments(raw))
        setManualEdit(false)
        if (originalByPathRef.current[path] === undefined) {
          originalByPathRef.current[path] = raw
        }
        setDirty(false)
        setResolvedMap((prev) => ({ ...prev, [path]: !hasConflictMarkers(raw) }))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to read file')
        setContent('')
        setSegments([])
      } finally {
        setLoading(false)
      }
    },
    [projectId],
  )

  const loadTriples = useCallback(
    async (path: string | null, base: string, incoming: string) => {
      if (!path || !projectId) return
      setTriplesLoading(true)
      try {
        const [ours, theirs] = await Promise.all([
          getFileContent(path, base).catch(() => ''),
          getFileContent(path, incoming).catch(() => ''),
        ])
        setOursText(ours)
        setTheirsText(theirs)
      } finally {
        setTriplesLoading(false)
      }
    },
    [projectId, getFileContent],
  )

  // Reset state whenever the modal reopens with a fresh conflict set.
  useEffect(() => {
    if (!isOpen) return
    setSelected(firstPath)
    originalByPathRef.current = {}
    setResolvedMap({})
    setError(null)
    setDirty(false)
    setManualEdit(false)
    setFinalizeMsg(mergeMessage || `Merge branch ${branch}`)
  }, [isOpen, conflicts, branch, firstPath, mergeMessage])

  useEffect(() => {
    if (isOpen) void loadFile(selected)
  }, [isOpen, selected, loadFile])

  // Web loads "theirs" from `branch` (the merge source); keep that pairing.
  useEffect(() => {
    if (isOpen && selected) void loadTriples(selected, baseRef, branch)
  }, [isOpen, selected, baseRef, branch, loadTriples])

  const commitSegments = useCallback((next: Segment[]) => {
    const joined = serializeSegments(next)
    setSegments(next)
    setContent(joined)
    setDirty(true)
  }, [])

  const applyChoice = (index: number, choice: 'ours' | 'theirs' | 'both') => {
    const seg = segments[index]
    if (!seg || seg.type !== 'conflict') return
    const next = [...segments]
    next.splice(index, 1, {
      type: 'text',
      text: resolveConflict(seg, choice, bothOrder),
    })
    commitSegments(next)
  }

  const applyChoiceAll = (choice: 'ours' | 'theirs' | 'both') => {
    const next: Segment[] = segments.map((seg) =>
      seg.type === 'conflict'
        ? { type: 'text', text: resolveConflict(seg, choice, bothOrder) }
        : seg,
    )
    commitSegments(next)
  }

  const acceptFile = (side: 'ours' | 'theirs') => {
    const txt = side === 'ours' ? oursText : theirsText
    setContent(txt)
    setSegments(parseConflictSegments(txt))
    setDirty(true)
  }

  const resetFileToOriginal = () => {
    if (!selected) return
    const orig = originalByPathRef.current[selected]
    if (typeof orig !== 'string') return
    setContent(orig)
    setSegments(parseConflictSegments(orig))
    setDirty(true)
  }

  const onWriteAndStage = async () => {
    if (!selected || !projectId) return
    setSaving(true)
    setError(null)
    try {
      await writeFileSdk({
        path: { projectId },
        body: { path: selected, content },
        throwOnError: true,
      })
      try {
        await stage([selected])
      } catch {
        // Stage failure doesn't block — the file is written; user can retry.
      }
      setDirty(false)
      setResolvedMap((prev) => ({ ...prev, [selected]: !hasConflictMarkers(content) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file')
    } finally {
      setSaving(false)
    }
  }

  const doAbort = async () => {
    if (aborting) return
    setAborting(true)
    setError(null)
    try {
      if (status?.merging) await abortMerge()
      else await resetAll()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to abort merge')
    } finally {
      setAborting(false)
    }
  }

  const doFinalize = async () => {
    if (finalizing) return
    setFinalizing(true)
    setError(null)
    try {
      try {
        await stage(conflicts.map((c) => c.path))
      } catch {
        // Best-effort; if a file is missing, commit fails loudly below.
      }
      const message = finalizeMsg.trim() || `Merge branch ${branch}`
      await commit({ message })
      if (pushImmediately) {
        try {
          await push()
        } catch (pushErr) {
          setError(pushErr instanceof Error ? pushErr.message : 'Push failed')
          return
        }
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize merge')
    } finally {
      setFinalizing(false)
    }
  }

  const fileResolved = !hasConflictMarkers(content)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resolve merge conflicts" size="xl">
      <View className="gap-3">
        {error ? <Alert variant="error">{error}</Alert> : null}

        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-[var(--text-muted)]">
            {resolvedCount}/{totalFiles} file{totalFiles === 1 ? '' : 's'} resolved
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-xs text-[var(--text-secondary)]">Both order</Text>
            <SegmentedControl
              size="sm"
              options={[...BOTH_ORDER_OPTIONS]}
              value={bothOrder}
              onChange={(v) => setBothOrder(v as BothOrder)}
            />
          </View>
        </View>

        {/* Conflicted-file picker — horizontal chips. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          {conflicts.map((c) => {
            const isSel = c.path === selected
            const isResolved = resolvedMap[c.path]
            return (
              <Pressable
                key={c.path}
                onPress={() => setSelected(c.path)}
                className={`rounded-md border px-3 py-1.5 ${
                  isSel
                    ? 'border-[var(--accent-primary)] bg-[var(--surface-muted)]'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-raised)]'
                }`}
              >
                <Text
                  className="font-mono text-xs text-[var(--text-primary)]"
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {c.path.split('/').pop()}
                </Text>
                <Text
                  className={`text-[10px] ${
                    isResolved ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {isResolved ? 'Resolved' : 'Unresolved'}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {!selected ? (
          <Text className="py-6 text-center text-sm text-[var(--text-muted)]">
            Select a conflicted file to resolve.
          </Text>
        ) : loading ? (
          <View className="py-6">
            <Spinner label="Loading file…" />
          </View>
        ) : isBinary ? (
          <View className="gap-3 py-2">
            <Text className="text-sm text-[var(--text-muted)]">
              Binary conflict — pick a side from one of the parents.
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <Button size="sm" onPress={() => acceptFile('ours')}>
                Accept ours
              </Button>
              <Button size="sm" onPress={() => acceptFile('theirs')}>
                Accept theirs
              </Button>
              <Button size="sm" variant="secondary" onPress={() => void onWriteAndStage()}>
                Save &amp; Stage
              </Button>
            </View>
          </View>
        ) : (
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text
                className="flex-1 font-mono text-xs text-[var(--text-secondary)]"
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {selected}
              </Text>
              <Text className="ml-2 text-xs text-[var(--text-muted)]">
                {fileResolved
                  ? 'No conflicts'
                  : `${unresolvedCount} conflict${unresolvedCount === 1 ? '' : 's'} left`}
              </Text>
            </View>

            {/* Bulk / file-level actions. */}
            <View className="flex-row flex-wrap gap-2">
              <Button size="sm" variant="secondary" onPress={() => applyChoiceAll('ours')}>
                Ours (all)
              </Button>
              <Button size="sm" variant="secondary" onPress={() => applyChoiceAll('theirs')}>
                Theirs (all)
              </Button>
              <Button size="sm" variant="secondary" onPress={() => applyChoiceAll('both')}>
                Both (all)
              </Button>
              <Button size="sm" variant="ghost" onPress={() => acceptFile('ours')}>
                Accept ours (file)
              </Button>
              <Button size="sm" variant="ghost" onPress={() => acceptFile('theirs')}>
                Accept theirs (file)
              </Button>
              <Button size="sm" variant="ghost" onPress={resetFileToOriginal}>
                Reset file
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => {
                  if (manualEdit) {
                    setSegments(parseConflictSegments(content))
                  }
                  setManualEdit((v) => !v)
                }}
              >
                {manualEdit ? 'Hunk view' : 'Edit manually'}
              </Button>
            </View>

            {manualEdit ? (
              <View className="gap-1">
                <Text className="text-xs text-[var(--text-muted)]">Result (editable)</Text>
                <Textarea
                  value={content}
                  onChangeText={(t) => {
                    setContent(t)
                    setDirty(true)
                  }}
                  rows={14}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
                {segments.length === 0 ? (
                  <Text className="text-sm text-[var(--text-muted)]">Empty file.</Text>
                ) : (
                  segments.map((seg, idx) =>
                    seg.type === 'text' ? (
                      seg.text.trim() ? (
                        <CodeBlock key={idx} text={seg.text} />
                      ) : null
                    ) : (
                      <ConflictHunk
                        key={idx}
                        ours={seg.ours}
                        theirs={seg.theirs}
                        oursLabel={seg.oursLabel}
                        theirsLabel={seg.theirsLabel}
                        onChoose={(choice) => applyChoice(idx, choice)}
                      />
                    ),
                  )
                )}
              </ScrollView>
            )}

            {/* Incoming / current context panes. */}
            <ContextPane label="Theirs (incoming)" text={theirsText} loading={triplesLoading} />
            <ContextPane label="Ours (current)" text={oursText} loading={triplesLoading} />

            <Button
              onPress={() => void onWriteAndStage()}
              loading={saving}
              disabled={!dirty || saving}
            >
              Save &amp; stage file
            </Button>
          </View>
        )}

        {/* Finalize / abort footer. */}
        <View className="gap-2 border-t border-[var(--border-subtle)] pt-3">
          <Text className="text-xs text-[var(--text-muted)]">Merge commit message</Text>
          <Textarea
            value={finalizeMsg}
            onChangeText={setFinalizeMsg}
            rows={2}
            placeholder={`Merge branch ${branch}`}
          />
          <Pressable
            onPress={() => setPushImmediately((v) => !v)}
            className="flex-row items-center gap-2 py-1"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: pushImmediately }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                borderWidth: 1.5,
                borderColor: pushImmediately ? '#2563eb' : '#9ca3af',
                backgroundColor: pushImmediately ? '#2563eb' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {pushImmediately ? <Text style={{ color: '#fff', fontSize: 11 }}>✓</Text> : null}
            </View>
            <Text className="text-sm text-[var(--text-secondary)]">Push after commit</Text>
          </Pressable>
          <View className="flex-row gap-2">
            <Button
              variant="secondary"
              onPress={() => void doAbort()}
              loading={aborting}
              style={{ flex: 1 }}
            >
              Abort merge
            </Button>
            <Button
              onPress={() => void doFinalize()}
              loading={finalizing}
              disabled={!allResolved || finalizing}
              style={{ flex: 1 }}
            >
              Finalize merge
            </Button>
          </View>
          {!allResolved ? (
            <Text className="text-center text-xs text-[var(--text-muted)]">
              Resolve and stage every file to finalize.
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

/** Read-only monospace block for a run of non-conflicting content. */
function CodeBlock({ text }: { text: string }) {
  return (
    <View className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text
          className="text-[var(--text-secondary)]"
          style={{ fontFamily: 'monospace', fontSize: 11 }}
        >
          {text.replace(/\r\n/g, '\n').replace(/\n$/, '')}
        </Text>
      </ScrollView>
    </View>
  )
}

/** One conflict hunk — stacked ours/theirs panes plus a 3-way choice. */
function ConflictHunk({
  ours,
  theirs,
  oursLabel,
  theirsLabel,
  onChoose,
}: {
  ours: string
  theirs: string
  oursLabel: string
  theirsLabel: string
  onChoose: (choice: 'ours' | 'theirs' | 'both') => void
}) {
  return (
    <View className="overflow-hidden rounded-md border border-[var(--status-warning-border,#d97706)]">
      <Text className="bg-[var(--surface-muted)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Conflict
      </Text>
      <View className="gap-2 p-2">
        <HunkSide label={`Ours · ${oursLabel}`} text={ours} />
        <HunkSide label={`Theirs · ${theirsLabel}`} text={theirs} />
        <View className="flex-row gap-2">
          <Button size="sm" onPress={() => onChoose('ours')} style={{ flex: 1 }}>
            Ours
          </Button>
          <Button size="sm" onPress={() => onChoose('theirs')} style={{ flex: 1 }}>
            Theirs
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => onChoose('both')}
            style={{ flex: 1 }}
          >
            Both
          </Button>
        </View>
      </View>
    </View>
  )
}

function HunkSide({ label, text }: { label: string; text: string }) {
  return (
    <View className="gap-1">
      <Text className="text-[10px] text-[var(--text-muted)]">{label}</Text>
      <View className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text
            className="text-[var(--text-primary)]"
            style={{ fontFamily: 'monospace', fontSize: 11 }}
          >
            {text.replace(/\r\n/g, '\n') || '(empty)'}
          </Text>
        </ScrollView>
      </View>
    </View>
  )
}

/** Collapsible read-only pane showing a parent's full file content. */
function ContextPane({ label, text, loading }: { label: string; text: string; loading: boolean }) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  return (
    <View className="rounded-md border border-[var(--border-subtle)]">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center gap-2 bg-[var(--surface-muted)] px-3 py-2"
      >
        {open ? (
          <IconChevronDown size={14} color={theme.text.muted} />
        ) : (
          <IconChevronRight size={14} color={theme.text.muted} />
        )}
        <Text className="text-xs text-[var(--text-secondary)]">{label}</Text>
      </Pressable>
      {open ? (
        loading ? (
          <View className="p-3">
            <Spinner />
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 200 }} className="p-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text
                className="text-[var(--text-secondary)]"
                style={{ fontFamily: 'monospace', fontSize: 11 }}
              >
                {text.replace(/\r\n/g, '\n') || '(empty)'}
              </Text>
            </ScrollView>
          </ScrollView>
        )
      ) : null}
    </View>
  )
}
