import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pressable, SectionList, Text, View } from 'react-native'
import type {
  SectionListData,
  SectionListRenderItem,
  StyleProp,
  ViewStyle,
} from 'react-native'
import Code from '../Code'
import Spinner from '../../primitives/Spinner'
import { IconChevronDown, IconChevronRight } from '../../icons'
import { msToShort } from '../../../headless/utils/testsFormat'
import { nativeLightTheme, nativeSpace } from '../../../tokens/native'
import type { TestFailureLike, TestResultLike, TestsResultLike } from './types'

export type TestResultsListProps = {
  results: TestsResultLike
  /**
   * Async loader for the failing-test code snippet. Receives the project-
   * relative path of the failing file; resolve to its full text. Mobile
   * wires this to `FilesContext.readPaths` (web wires it to the
   * `readFile` SDK). When omitted, snippets are not rendered.
   */
  readFile?: (relPath: string) => Promise<string | undefined>
  /** Optional content rendered above the virtualized rows (used by callers
   *  like `CustomPane` to pin their own controls above the list). */
  ListHeaderComponent?: ReactNode
  /** Forwarded to the underlying SectionList. */
  style?: StyleProp<ViewStyle>
  /** Forwarded to the underlying SectionList's content container. */
  contentContainerStyle?: StyleProp<ViewStyle>
}

type Tone = 'failure' | 'pass' | 'skip'
type SectionKey = 'fail' | 'pass' | 'skip'

interface Section {
  key: SectionKey
  tone: Tone
  title: string
  open: boolean
  data: TestResultLike[]
  emptyMessage?: string
}

/**
 * Native peer of `web/compound/tests/TestResultsList`. Three collapsible
 * sections (Failing / Passing / Skipped) rendered with a virtualized
 * `SectionList` so each section's header sticks to the top of the viewport
 * while its file cards scroll past — standard mobile vertical-table UX. Only
 * the visible cards stay mounted, keeping push / unmount instant even with
 * hundreds of test files.
 */
export function TestResultsList({
  results,
  readFile,
  ListHeaderComponent,
  style,
  contentContainerStyle,
}: TestResultsListProps) {
  const tests = Array.isArray(results.tests) ? results.tests : []

  const failing = useMemo(
    () => tests.filter((t) => (t.failures?.length || 0) > 0 || t.status === 'fail'),
    [tests],
  )
  const skippedFiles = useMemo(
    () => tests.filter((t) => (t.summary?.skipped || 0) > 0),
    [tests],
  )
  const passing = useMemo(
    () => tests.filter((t) => (t.summary?.passed || 0) > 0 && t.status === 'ok'),
    [tests],
  )

  const failedCount = results.summary?.failed || 0
  const passedCount = results.summary?.passed || 0
  const skippedCount = results.summary?.skipped || 0
  const hasFailures = failedCount > 0 || failing.length > 0
  const hasSkips = skippedCount > 0
  const hasPasses = passedCount > 0

  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    fail: true,
    pass: true,
    skip: true,
  })
  const toggle = useCallback(
    (key: SectionKey) => setOpen((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  )

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = []
    if (hasFailures) {
      out.push({
        key: 'fail',
        tone: 'failure',
        title: `${failedCount} failing test${failedCount === 1 ? '' : 's'}`,
        open: open.fail,
        data: open.fail ? failing : [],
        emptyMessage: failing.length === 0 ? 'No structured failures detected.' : undefined,
      })
    }
    if (hasPasses) {
      out.push({
        key: 'pass',
        tone: 'pass',
        title: `${passedCount} passing test${passedCount === 1 ? '' : 's'}`,
        open: open.pass,
        data: open.pass ? passing : [],
      })
    }
    if (hasSkips) {
      out.push({
        key: 'skip',
        tone: 'skip',
        title: `${skippedCount} skipped test${skippedCount === 1 ? '' : 's'}`,
        open: open.skip,
        data: open.skip ? skippedFiles : [],
      })
    }
    return out
  }, [
    hasFailures,
    hasPasses,
    hasSkips,
    failing,
    passing,
    skippedFiles,
    failedCount,
    passedCount,
    skippedCount,
    open,
  ])

  const keyExtractor = useCallback((item: TestResultLike, idx: number) => `${item.filePath}-${idx}`, [])

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<TestResultLike, Section> }) => (
      <View
        style={{
          backgroundColor: nativeLightTheme.surface.base,
          paddingTop: 4,
          paddingBottom: 6,
        }}
      >
        <SectionHeader
          title={section.title}
          tone={section.tone}
          open={section.open}
          onToggle={() => toggle(section.key)}
        />
        {section.open && section.emptyMessage ? (
          <Text
            style={{
              fontSize: 12,
              color: nativeLightTheme.text.muted,
              paddingHorizontal: 12,
              paddingTop: 6,
            }}
          >
            {section.emptyMessage}
          </Text>
        ) : null}
      </View>
    ),
    [toggle],
  )

  const renderItem = useCallback<SectionListRenderItem<TestResultLike, Section>>(
    ({ item, section }) => (
      <View style={{ paddingTop: 8 }}>
        <FileCard test={item} tone={section.tone} readFile={readFile} />
      </View>
    ),
    [readFile],
  )

  if (!hasFailures && !hasSkips && !hasPasses) {
    return (
      <View>
        {ListHeaderComponent}
        <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted }}>No tests found.</Text>
      </View>
    )
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      stickySectionHeadersEnabled
      ListHeaderComponent={ListHeaderComponent != null ? <>{ListHeaderComponent}</> : null}
      initialNumToRender={6}
      windowSize={5}
      removeClippedSubviews
      style={style}
      contentContainerStyle={contentContainerStyle}
    />
  )
}

const TONE_COLOR: Record<Tone, string> = {
  failure: '#b91c1c',
  pass: '#15803d',
  skip: '#b45309',
}

const SectionHeader = memo(function SectionHeader({
  title,
  tone,
  open,
  onToggle,
}: {
  title: string
  tone: Tone
  open: boolean
  onToggle: () => void
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: nativeLightTheme.border.subtle,
        borderRadius: 6,
        backgroundColor: pressed ? nativeLightTheme.surface.hover : nativeLightTheme.surface.raised,
      })}
    >
      <Text style={{ fontSize: 14, fontWeight: '500', color: TONE_COLOR[tone] }}>{title}</Text>
      {open ? (
        <IconChevronDown size={16} color={nativeLightTheme.text.muted} />
      ) : (
        <IconChevronRight size={16} color={nativeLightTheme.text.muted} />
      )}
    </Pressable>
  )
})

const FileCard = memo(function FileCard({
  test,
  tone,
  readFile,
}: {
  test: TestResultLike
  tone: Tone
  readFile?: (relPath: string) => Promise<string | undefined>
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: nativeLightTheme.border.subtle,
        borderRadius: 6,
        padding: 12,
        gap: 8,
        backgroundColor: nativeLightTheme.surface.base,
      }}
    >
      <FileHeader t={test} />
      {tone === 'failure' ? (
        <View style={{ gap: 8 }}>
          {(test.failures || []).map((f, i) => (
            <FailureItem key={i} test={test} failure={f} readFile={readFile} />
          ))}
        </View>
      ) : null}
      {tone === 'failure' || tone === 'pass' ? <PassesList t={test} /> : null}
      <SkipsList t={test} />
      {tone !== 'failure' ? <PassesList t={test} /> : null}
      <RawOutput t={test} />
    </View>
  )
})

function FileHeader({ t }: { t: TestResultLike }) {
  const dur = msToShort(t.summary?.durationMs)
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="middle"
        style={{
          flex: 1,
          fontSize: 12,
          fontFamily: 'Menlo',
          color: nativeLightTheme.text.secondary,
        }}
      >
        {t.filePath}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 12, color: '#15803d' }}>{`✓ ${t.summary.passed}`}</Text>
        <Text style={{ fontSize: 12, color: '#b91c1c' }}>{`✗ ${t.summary.failed}`}</Text>
        <Text style={{ fontSize: 12, color: '#b45309' }}>{`○ ${t.summary.skipped}`}</Text>
        {dur ? (
          <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted }}>{`• ${dur}`}</Text>
        ) : null}
      </View>
    </View>
  )
}

function FailureItem({
  test,
  failure,
  readFile,
}: {
  test: TestResultLike
  failure: TestFailureLike
  readFile?: (relPath: string) => Promise<string | undefined>
}) {
  const rel = test.filePath
  const hasLineLocation = Boolean(failure.line && failure.column)
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: nativeLightTheme.border.subtle,
        borderRadius: 6,
        padding: 12,
        gap: 8,
      }}
    >
      {failure.testName ? (
        <Text style={{ fontSize: 14, fontWeight: '500', color: nativeLightTheme.text.primary }}>
          {failure.testName}
        </Text>
      ) : null}
      {failure.message ? (
        <Text selectable style={{ fontSize: 12, color: '#dc2626' }}>
          {failure.message}
        </Text>
      ) : null}
      <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted, fontFamily: 'Menlo' }}>
        {rel}
        {failure.line ? `:${failure.line}` : ''}
        {failure.column ? `:${failure.column}` : ''}
      </Text>

      {hasLineLocation && readFile ? (
        <CodeSnippet
          readFile={readFile}
          relPath={rel}
          line={failure.line ?? null}
          column={failure.column ?? null}
        />
      ) : null}
      {!hasLineLocation && failure.stack ? (
        <Text
          selectable
          style={{
            fontSize: 11,
            fontFamily: 'Menlo',
            color: nativeLightTheme.text.muted,
          }}
        >
          {failure.stack}
        </Text>
      ) : null}
    </View>
  )
}

function CodeSnippet({
  readFile,
  relPath,
  line,
  column,
}: {
  readFile: (relPath: string) => Promise<string | undefined>
  relPath: string
  line: number | null
  column: number | null
}) {
  const [state, setState] = useState<{ loading: boolean; text?: string; error?: string }>({
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const content = await readFile(relPath)
        if (cancelled) return
        if (typeof content !== 'string') {
          setState({ loading: false, error: 'No content available' })
          return
        }
        const lines = content.split(/\r?\n/)
        const idx = line && line > 0 ? line - 1 : 0
        const start = Math.max(0, idx - 4)
        const end = Math.min(lines.length, idx + 3)
        const numbered: string[] = []
        for (let i = start; i < end; i++) {
          const ln = i + 1
          const marker = ln === line ? '>' : ' '
          const colMarker = ln === line && column ? `:${column}` : ''
          numbered.push(`${marker} ${ln.toString().padStart(4, ' ')}${colMarker}  ${lines[i]}`)
        }
        setState({ loading: false, text: numbered.join('\n') })
      } catch (e: unknown) {
        if (!cancelled) {
          setState({ loading: false, error: e instanceof Error ? e.message : String(e) })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [readFile, relPath, line, column])

  if (state.loading) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Spinner size={14} />
        <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted }}>Loading snippet…</Text>
      </View>
    )
  }
  if (state.error || !state.text) {
    return (
      <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted }}>
        Failed to load snippet{state.error ? `: ${state.error}` : ''}
      </Text>
    )
  }
  return <Code code={state.text} language="text" />
}

function SkipsList({ t }: { t: TestResultLike }) {
  if (!t.skips.length) return null
  return (
    <View style={{ gap: 4 }}>
      {t.skips.map((s, i) => (
        <View
          key={i}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[2] }}
        >
          <Text style={{ fontSize: 12, color: '#b45309' }}>○</Text>
          <Text style={{ flex: 1, fontSize: 12, color: '#b45309' }}>{s.testName}</Text>
        </View>
      ))}
    </View>
  )
}

function PassesList({ t }: { t: TestResultLike }) {
  if (!t.passes.length) return null
  return (
    <View style={{ gap: 4 }}>
      {t.passes.map((s, i) => (
        <View
          key={i}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[2] }}
        >
          <Text style={{ fontSize: 12, color: '#15803d' }}>✓</Text>
          <Text style={{ flex: 1, fontSize: 12, color: '#15803d' }}>{s.testName}</Text>
        </View>
      ))}
    </View>
  )
}

function RawOutput({ t }: { t: TestResultLike }) {
  const [open, setOpen] = useState(false)
  if (!t.rawText) return null
  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        hitSlop={4}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        {open ? (
          <IconChevronDown size={14} color={nativeLightTheme.text.muted} />
        ) : (
          <IconChevronRight size={14} color={nativeLightTheme.text.muted} />
        )}
        <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted }}>
          {open ? 'Hide raw output' : 'Show raw output'}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ marginTop: 4 }}>
          <Code code={t.rawText} language="text" />
        </View>
      ) : null}
    </View>
  )
}

export default TestResultsList
