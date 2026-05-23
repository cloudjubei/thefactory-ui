import { useEffect, useState, type ReactNode } from 'react'

import Spinner from '../../primitives/Spinner'
import { IconChevron } from '../../icons'
import { msToShort } from './format'
import type { TestFailureLike, TestResultLike, TestsResultLike } from './types'

export type TestResultsListProps = {
  results: TestsResultLike
  /**
   * Async loader for the failing-test code snippet. Receives the project-
   * relative path of the failing file; resolve to its full text. Web wires
   * this to the `readFile` SDK, desktop to its IPC. When omitted, snippets
   * are not rendered.
   */
  readFile?: (relPath: string) => Promise<string | undefined>
}

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
    return <div className="text-xs text-neutral-500">No tests found.</div>
  }

  return (
    <div className="space-y-4">
      {hasFailures && (
        <CollapsibleSection
          title={`${failedCount} failing test${failedCount === 1 ? '' : 's'}`}
          tone="failure"
        >
          {failing.length === 0 ? (
            <div className="text-xs text-neutral-500">
              No structured failures detected. See raw outputs below.
            </div>
          ) : null}
          {failing.map((t, idx) => (
            <div
              key={`fail-${idx}`}
              className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3 space-y-2"
            >
              <FileHeader t={t} />
              <div className="space-y-2">
                {(t.failures || []).map((f, i) => (
                  <FailureItem key={i} test={t} failure={f} readFile={readFile} />
                ))}
              </div>
              <SkipsList t={t} />
              <PassesList t={t} />
              <RawOutput t={t} />
            </div>
          ))}
        </CollapsibleSection>
      )}

      {hasPasses && (
        <CollapsibleSection
          title={`${passedCount} passing test${passedCount === 1 ? '' : 's'}`}
          tone="pass"
        >
          {passing.map((t, idx) => (
            <div
              key={`pass-${idx}`}
              className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3 space-y-2"
            >
              <FileHeader t={t} />
              <PassesList t={t} />
              <SkipsList t={t} />
              <RawOutput t={t} />
            </div>
          ))}
        </CollapsibleSection>
      )}

      {hasSkips && (
        <CollapsibleSection
          title={`${skippedCount} skipped test${skippedCount === 1 ? '' : 's'}`}
          tone="skip"
        >
          {skippedFiles.map((t, idx) => (
            <div
              key={`skip-${idx}`}
              className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3 space-y-2"
            >
              <FileHeader t={t} />
              <SkipsList t={t} />
              <PassesList t={t} />
              <RawOutput t={t} />
            </div>
          ))}
        </CollapsibleSection>
      )}
    </div>
  )
}

type Tone = 'failure' | 'pass' | 'skip'

const TONE_CLASS: Record<Tone, string> = {
  failure: 'text-red-700 dark:text-red-300',
  pass: 'text-green-700 dark:text-green-300',
  skip: 'text-amber-700 dark:text-amber-300',
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
    <section className="relative">
      {/* Sticky section header — pins to the top of the scroll container as
       *  the section's contents scroll past, then transitions out as the
       *  next section's header takes its place. Matches the mobile
       *  `SectionList` sticky-header pattern. The wrapping div carries the
       *  opaque background so the corners outside the rounded button still
       *  paint, otherwise content would scroll visibly through them. The
       *  `-top-3` overshoots the scroll container's `pt-3` so the sticky
       *  pins flush with the visible viewport — without it, items would
       *  scroll into the 12px padding gap above the header. */}
      <div className="sticky -top-3 z-10 bg-(--surface-base) pt-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left rounded-md border border-neutral-200 dark:border-neutral-800 bg-(--surface-raised) hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
        >
          <span className={`text-sm font-medium ${TONE_CLASS[tone]}`}>{title}</span>
          <IconChevron
            className="w-4 h-4 opacity-70 transition-transform"
            style={{ transform: open ? 'rotate(90deg)' : undefined }}
          />
        </button>
      </div>
      {open && <div className="space-y-2">{children}</div>}
    </section>
  )
}

function FileHeader({ t }: { t: TestResultLike }) {
  const dur = msToShort(t.summary?.durationMs)
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="font-mono text-xs text-neutral-700 dark:text-neutral-300 break-all">
        {t.filePath}
      </div>
      <div className="text-xs flex items-center gap-2">
        <span className="text-green-600 dark:text-green-400">✓ {t.summary.passed}</span>
        <span className="text-red-600 dark:text-red-400">✗ {t.summary.failed}</span>
        <span className="text-amber-600 dark:text-amber-400">○ {t.summary.skipped}</span>
        {typeof t.summary.durationMs === 'number' && (
          <span className="text-neutral-500">• {dur}</span>
        )}
      </div>
    </div>
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
    <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          {failure.testName && (
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {failure.testName}
            </div>
          )}
          {failure.message && (
            <div className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
              {failure.message}
            </div>
          )}
        </div>
      </div>
      <div className="text-xs text-neutral-600 dark:text-neutral-400">
        {rel}
        {failure.line ? `:${failure.line}` : ''}
        {failure.column ? `:${failure.column}` : ''}
      </div>

      {hasLineLocation && readFile && (
        <CodeSnippet
          readFile={readFile}
          relPath={rel}
          line={failure.line ?? null}
          column={failure.column ?? null}
        />
      )}
      {!hasLineLocation && failure.stack && (
        <details className="mt-1">
          <summary className="text-xs text-neutral-500 cursor-pointer">Stack trace</summary>
          <pre className="text-[11px] bg-neutral-50 dark:bg-neutral-900 p-2 rounded-md overflow-auto whitespace-pre-wrap">
            {failure.stack}
          </pre>
        </details>
      )}
    </div>
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

  if (state.loading) return <Spinner size={14} label="Loading snippet..." />
  if (state.error)
    return <div className="text-xs text-neutral-500">Failed to load snippet: {state.error}</div>
  return (
    <pre className="text-xs bg-neutral-50 dark:bg-neutral-900 p-3 rounded-md overflow-auto whitespace-pre">
      {state.text}
    </pre>
  )
}

function SkipsList({ t }: { t: TestResultLike }) {
  if (!t.skips.length) return null
  return (
    <div className="space-y-1">
      {t.skips.map((s, i) => (
        <div key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <span>○</span>
          <span className="whitespace-pre-wrap break-words">{s.testName}</span>
        </div>
      ))}
    </div>
  )
}

function PassesList({ t }: { t: TestResultLike }) {
  if (!t.passes.length) return null
  return (
    <div className="space-y-1">
      {t.passes.map((s, i) => (
        <div key={i} className="text-xs text-green-700 dark:text-green-300 flex items-start gap-2">
          <span>✓</span>
          <span className="whitespace-pre-wrap break-words">{s.testName}</span>
        </div>
      ))}
    </div>
  )
}

function RawOutput({ t }: { t: TestResultLike }) {
  if (!t.rawText) return null
  return (
    <details>
      <summary className="text-xs text-neutral-500 cursor-pointer">Raw output</summary>
      <pre className="text-[11px] bg-neutral-50 dark:bg-neutral-900 p-2 rounded-md overflow-auto whitespace-pre-wrap max-h-64">
        {t.rawText}
      </pre>
    </details>
  )
}

export default TestResultsList
