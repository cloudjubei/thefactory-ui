import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import {
  EMPTY_TREE_SHA,
  generateHunkPatch,
  generateSelectedPatch,
  getFilePatch,
  parseUnifiedDiffAnnotated,
  useGitWithLog,
  type IntraMode,
  type LocalDiffEntry,
} from '../../../headless'
import type { GitDiffSummary } from '../../../headless/api'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'
import ScreenShell from '../shell/ScreenShell'
import DiffOptionsToolbar from './DiffOptionsToolbar'
import UnifiedDiff from './UnifiedDiff'

/** Source of the file diff this screen is rendering. Matches web's
 *  `LocalChangesPane` vs `CommitDiffViewer` split — same screen, three
 *  modes driven by the route's query / path. */
export type GitFileDiffSource =
  | { kind: 'commit'; commitSha: string }
  | { kind: 'staged' }
  | { kind: 'unstaged' }

export type GitFileDiffViewProps = {
  /** Branch name the file lives under — drives the ScreenShell title so
   *  the user always knows which branch they're inside. */
  branchName: string
  /** Working-tree path to the file. Surfaced in the body via `PathDisplay`. */
  filePath: string
  source: GitFileDiffSource
  /** Pop back to the previous screen (branch / stash detail). */
  goBack: () => void
}

/**
 * `UnifiedDiff.maxHeight` value meaning "no cap" on a full-screen diff —
 * the diff body is already `flex: 1`, so a very large ceiling lets it fill
 * the pane. `UnifiedDiff` defaults to 360 (its embedded-preview height).
 */
const DIFF_FULL_HEIGHT = 9999

/**
 * Per-file diff for a commit, a stash, or a working-tree file (staged or
 * unstaged). Native peer of web's `DiffViewer` behaviour:
 *   - Branch in the screen title; file path on the next row.
 *   - Single-row toolbar (Wrap, Ignore WS, Intra) via `DiffOptionsToolbar`.
 *   - Hunk-level Stage / Unstage / Discard buttons inside each hunk header
 *     via `UnifiedDiff`'s `isEditable` flow.
 *   - "Select Lines" mode toggling per-line checkboxes for partial
 *     staging / discard, wired to the shared `generateSelectedPatch`.
 *
 * The host owns safe-area wrapping (this package stays free of
 * `react-native-safe-area-context`).
 */
export default function GitFileDiffView({
  branchName,
  filePath,
  source,
  goBack,
}: GitFileDiffViewProps) {
  const { theme } = useNativeTheme()
  const git = useGitWithLog()

  // View options — start with the same defaults as web's `DiffViewer`.
  const [wrap, setWrap] = useState(false)
  const [ignoreWS, setIgnoreWS] = useState(false)
  const [intra, setIntra] = useState<IntraMode>('word')

  // Selection mode — mirrors web's `selectable` / `selectedLines` state.
  const [selectable, setSelectable] = useState(false)
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set())

  const [commitDiff, setCommitDiff] = useState<GitDiffSummary | null>(null)
  const [loading, setLoading] = useState(source.kind === 'commit')
  const [error, setError] = useState<string | null>(null)

  // Commit / stash mode: fetch the full ref-pair diff once and slice the
  // requested file's patch out of the combined `patch` via `getFilePatch`.
  useEffect(() => {
    if (source.kind !== 'commit') return
    let cancelled = false
    setLoading(true)
    setError(null)
    setCommitDiff(null)
    const found = git.log.find((c) => c.hash === source.commitSha) ?? null
    const baseRef = found ? (found.parents?.[0] ?? EMPTY_TREE_SHA) : `${source.commitSha}^`
    git
      .getCommitDiff(baseRef, source.commitSha)
      .then((d) => {
        if (!cancelled) setCommitDiff(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [source, git])

  // Working-tree modes use the already-loaded `localDiff` from `GitContext`.
  const workingEntry = useMemo<LocalDiffEntry | null>(() => {
    if (source.kind === 'staged') {
      return git.localDiff?.staged.find((e) => e.path === filePath) ?? null
    }
    if (source.kind === 'unstaged') {
      return git.localDiff?.unstaged.find((e) => e.path === filePath) ?? null
    }
    return null
  }, [source, filePath, git.localDiff])

  const { patch, binary, isConflicted, suppressed } = useMemo(() => {
    if (source.kind === 'commit') {
      const file = commitDiff?.files.find((f) => f.path === filePath)
      const fileSuppressed = file?.patchSuppressed === 'size'
      return {
        patch: fileSuppressed
          ? undefined
          : file?.patch || (commitDiff ? getFilePatch(commitDiff.patch, filePath) : undefined),
        binary: file?.binary,
        isConflicted: false,
        suppressed: fileSuppressed,
      }
    }
    return {
      patch: workingEntry?.patch,
      binary: workingEntry?.binary,
      isConflicted: workingEntry?.isConflicted,
      suppressed: workingEntry?.patchSuppressed === 'size',
    }
  }, [source.kind, filePath, commitDiff, workingEntry])

  // Reset selection when the underlying patch changes — same effect web
  // runs in `DiffViewer`.
  useEffect(() => {
    setSelectedLines(new Set())
    setSelectable(false)
  }, [patch, filePath])

  const isWorkingTree = source.kind === 'staged' || source.kind === 'unstaged'
  const isStaged = source.kind === 'staged'

  const runApply = useCallback(
    async (hunkPatch: string, reverse: boolean) => {
      setError(null)
      try {
        await git.applyPatch({ patch: hunkPatch, cached: true, reverse })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [git],
  )

  const runDiscard = useCallback(
    async (hunkPatch: string) => {
      setError(null)
      try {
        await git.applyPatch({ patch: hunkPatch, cached: false, reverse: true })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [git],
  )

  const toggleLineSelection = (hunkIndex: number, lineIndex: number) => {
    setSelectedLines((prev) => {
      const next = new Set(prev)
      const key = `${hunkIndex}:${lineIndex}`
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleHunkSelection = (hunkIndex: number) => {
    if (!patch) return
    const hunks = parseUnifiedDiffAnnotated(patch)
    const hunk = hunks[hunkIndex]
    if (!hunk) return
    setSelectedLines((prev) => {
      const next = new Set(prev)
      const modIdxs = hunk.lines
        .map((l, idx) => ({ l, idx }))
        .filter(({ l }) => l.type === 'add' || l.type === 'del')
        .map(({ idx }) => idx)
      const allSelected = modIdxs.every((idx) => next.has(`${hunkIndex}:${idx}`))
      modIdxs.forEach((idx) => {
        const key = `${hunkIndex}:${idx}`
        if (allSelected) next.delete(key)
        else next.add(key)
      })
      return next
    })
  }

  const handleApplySelection = () => {
    if (!patch) return
    void runApply(generateSelectedPatch(patch, selectedLines, isStaged), isStaged)
    setSelectable(false)
    setSelectedLines(new Set())
  }

  const handleDiscardSelection = () => {
    if (!patch) return
    void runDiscard(generateSelectedPatch(patch, selectedLines, true))
    setSelectable(false)
    setSelectedLines(new Set())
  }

  const hasSelection = selectedLines.size > 0

  if (loading) {
    return (
      <ScreenShell title={branchName} onBack={goBack}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Spinner size={32} label="Loading diff…" />
        </View>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={branchName} onBack={goBack}>
      <DiffOptionsToolbar
        filePath={filePath}
        wrap={wrap}
        onWrapChange={setWrap}
        ignoreWS={ignoreWS}
        onIgnoreWSChange={setIgnoreWS}
        intra={intra}
        onIntraChange={setIntra}
      />

      {/* Selection action row — staging / discard controls layered below
          the shared options toolbar; working-tree files only. */}
      {isWorkingTree && !isConflicted ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: nativeSpace[3],
            paddingVertical: nativeSpace[2],
            borderBottomWidth: 1,
            borderBottomColor: theme.border.subtle,
            backgroundColor: theme.surface.muted,
          }}
        >
          {selectable ? (
            <>
              <Button
                variant="success"
                size="sm"
                disabled={!hasSelection}
                onPress={handleApplySelection}
              >
                {isStaged ? 'Unstage Selected' : 'Stage Selected'}
              </Button>
              <View style={{ width: nativeSpace[2] }} />
              <Button
                variant="danger"
                size="sm"
                disabled={!hasSelection}
                onPress={handleDiscardSelection}
              >
                Discard Selected
              </Button>
            </>
          ) : null}
          <View style={{ flex: 1 }} />
          <Button
            variant="secondary"
            size="sm"
            onPress={() => {
              setSelectable((s) => {
                if (s) setSelectedLines(new Set())
                return !s
              })
            }}
          >
            {selectable ? 'Exit Selection' : 'Select Lines'}
          </Button>
        </View>
      ) : null}

      {error ? (
        <View style={{ padding: nativeSpace[3] }}>
          <Alert variant="error">{error}</Alert>
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <UnifiedDiff
          patch={patch}
          binary={binary}
          suppressed={suppressed}
          wrap={wrap}
          ignoreWhitespace={ignoreWS}
          intra={intra}
          maxHeight={DIFF_FULL_HEIGHT}
          selectable={selectable && isWorkingTree && !isConflicted}
          selectedLines={selectedLines}
          onToggleLineSelection={toggleLineSelection}
          onToggleHunkSelection={toggleHunkSelection}
          isEditable={isWorkingTree && !isConflicted}
          isStaged={isStaged}
          onStageHunk={(i) => {
            if (!patch) return
            void runApply(generateHunkPatch(patch, i), false)
          }}
          onUnstageHunk={(i) => {
            if (!patch) return
            void runApply(generateHunkPatch(patch, i), true)
          }}
          onDiscardHunk={(i) => {
            if (!patch) return
            void runDiscard(generateHunkPatch(patch, i))
          }}
        />
      </View>
    </ScreenShell>
  )
}
