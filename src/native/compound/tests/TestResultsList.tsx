import { useEffect, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import Code from '../Code'
import Spinner from '../../primitives/Spinner'
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
}

/**
 * Native peer of `web/compound/tests/TestResultsList`. Three collapsible
 * sections (Failing / Passing / Skipped); each test file is a card with
 * a header line, per-failure rows (with optional source snippet), and the
 * pass/skip rosters.
 */
export function TestResultsList({ results, readFile }: TestResultsListProps) {
  const tests = Array.isArray(results.tests) ? results.tests : []

  const failing = tests.filter((t) => (t.failures?.length || 0) > 0 || t.status === 'fail')
  const skippedFiles = tests.filter((t) => (t.summary?.skipped || 0) > 0)
  const passing = tests.filter((t) => (t.summary?.passed || 0) > 0 && t.status === 'ok')

  const failedCount = results.summary?.failed || 0
  const passedCount = results.summary?.passed || 0
  const skippedCount = results.summary?.skipped || 0
  const hasFailures = failedCount > 0 || failing.length > 0
  const hasSkips = skippedCount > 0
  const hasPasses = passedCount > 0

  if (!hasFailures && !hasSkips && !hasPasses) {
    return <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted }}>No tests found.</Text>
  }

  return (
    <View style={{ gap: 16 }}>
      {hasFailures ? (
        <CollapsibleSection
          title={`${failedCount} failing test${failedCount === 1 ? '' : 's'}`}
          tone="failure"
        >
          {failing.length === 0 ? (
            <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted }}>
              No structured failures detected.
            </Text>
          ) : null}
          {failing.map((t, idx) => (
            <View
              key={`fail-${idx}`}
              style={{
                borderWidth: 1,
                borderColor: nativeLightTheme.border.subtle,
                borderRadius: 6,
                padding: 12,
                gap: 8,
              }}
            >
              <FileHeader t={t} />
              <View style={{ gap: 8 }}>
                {(t.failures || []).map((f, i) => (
                  <FailureItem key={i} test={t} failure={f} readFile={readFile} />
                ))}
              </View>
              <SkipsList t={t} />
              <PassesList t={t} />
              <RawOutput t={t} />
            </View>
          ))}
        </CollapsibleSection>
      ) : null}

      {hasPasses ? (
        <CollapsibleSection
          title={`${passedCount} passing test${passedCount === 1 ? '' : 's'}`}
          tone="pass"
        >
          {passing.map((t, idx) => (
            <View
              key={`pass-${idx}`}
              style={{
                borderWidth: 1,
                borderColor: nativeLightTheme.border.subtle,
                borderRadius: 6,
                padding: 12,
                gap: 8,
              }}
            >
              <FileHeader t={t} />
              <PassesList t={t} />
              <SkipsList t={t} />
              <RawOutput t={t} />
            </View>
          ))}
        </CollapsibleSection>
      ) : null}

      {hasSkips ? (
        <CollapsibleSection
          title={`${skippedCount} skipped test${skippedCount === 1 ? '' : 's'}`}
          tone="skip"
        >
          {skippedFiles.map((t, idx) => (
            <View
              key={`skip-${idx}`}
              style={{
                borderWidth: 1,
                borderColor: nativeLightTheme.border.subtle,
                borderRadius: 6,
                padding: 12,
                gap: 8,
              }}
            >
              <FileHeader t={t} />
              <SkipsList t={t} />
              <PassesList t={t} />
              <RawOutput t={t} />
            </View>
          ))}
        </CollapsibleSection>
      ) : null}
    </View>
  )
}

type Tone = 'failure' | 'pass' | 'skip'

const TONE_COLOR: Record<Tone, string> = {
  failure: '#b91c1c',
  pass: '#15803d',
  skip: '#b45309',
}

function CollapsibleSection({
  title,
  tone,
  defaultOpen = true,
  children,
}: {
  title: string
  tone: Tone
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: nativeLightTheme.border.subtle,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: pressed ? nativeLightTheme.surface.hover : 'transparent',
        })}
      >
        <Text style={{ fontSize: 14, fontWeight: '500', color: TONE_COLOR[tone] }}>{title}</Text>
        <Text style={{ color: nativeLightTheme.text.muted }}>{open ? '▾' : '▸'}</Text>
      </Pressable>
      {open ? (
        <View
          style={{
            padding: 12,
            paddingTop: 8,
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: nativeLightTheme.border.subtle,
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  )
}

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
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" hitSlop={4}>
        <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted }}>
          {open ? '▾ Hide raw output' : '▸ Show raw output'}
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
