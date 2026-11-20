import {
  TEST_SESSION_COPY,
  TEST_SESSION_LINE_LABELS,
  TEST_SESSION_SHOWN_LINES,
} from './testSessionViewConstants'
import type {
  TestSession,
  TestSessionAction,
  TestSessionCount,
  TestSessionDisplay,
  TestSessionHelperRow,
  TestSessionHelperStatus,
  TestSessionLineKind,
  TestSessionState,
  TestSessionStatus,
  TestSessionTone,
} from './testSessionViewTypes'

type Shown = TestSessionStatus | 'idle'

const HEADLINES: Record<Shown, string> = {
  idle: TEST_SESSION_COPY.idle,
  starting: TEST_SESSION_COPY.starting,
  running: TEST_SESSION_COPY.running,
  stopping: TEST_SESSION_COPY.stopping,
  stopped: TEST_SESSION_COPY.stopped,
  failed: TEST_SESSION_COPY.failed,
}

const TONES: Record<Shown, TestSessionTone> = {
  idle: 'empty',
  starting: 'working',
  running: 'done',
  stopping: 'working',
  stopped: 'empty',
  failed: 'stuck',
}

const LINE_TONES: Record<TestSessionLineKind, TestSessionTone> = {
  error: 'stuck',
  warning: 'blocked',
  feature: 'done',
}

function shownStatus(state: TestSessionState, session: TestSession | undefined): Shown {
  if (state.pending === 'start') return 'starting'
  if (state.pending === 'stop') return 'stopping'
  return session?.status ?? 'idle'
}

function actionOf(shown: Shown, offered: boolean, pending: boolean): TestSessionAction | undefined {
  if (shown === 'starting' || shown === 'running' || shown === 'stopping') {
    return { kind: 'stop', label: TEST_SESSION_COPY.stop, busy: pending || shown === 'stopping' }
  }
  if (!offered) return undefined
  return {
    kind: 'start',
    label: shown === 'idle' ? TEST_SESSION_COPY.start : TEST_SESSION_COPY.startAgain,
    busy: false,
  }
}

function detailOf(shown: Shown, session: TestSession | undefined): string | undefined {
  if (session?.problem && (shown === 'failed' || shown === 'stopped')) return session.problem
  if (!session) return undefined
  return session.environment
    ? TEST_SESSION_COPY.data(session.environment)
    : TEST_SESSION_COPY.noData
}

const HELPER_ROWS: Record<TestSessionHelperStatus, { label: string; tone: TestSessionTone }> = {
  gathering: { label: TEST_SESSION_COPY.helperGathering, tone: 'working' },
  stopped: { label: TEST_SESSION_COPY.helperStopped, tone: 'empty' },
  'not-started': { label: TEST_SESSION_COPY.helperNotStarted, tone: 'stuck' },
}

function helperOf(session: TestSession | undefined): TestSessionHelperRow | undefined {
  const helper = session?.helper
  if (!helper) return undefined
  return {
    ...HELPER_ROWS[helper.status],
    ...(helper.problem ? { detail: helper.problem } : {}),
    chat: { context: helper.chatContext, chatContextId: helper.chatContextId },
    openLabel: TEST_SESSION_COPY.openChat,
  }
}

function countsOf(session: TestSession | undefined): TestSessionCount[] {
  if (!session) return []
  const { log } = session
  return [
    { key: 'error', label: TEST_SESSION_COPY.errors, value: log.errors, tone: LINE_TONES.error },
    {
      key: 'warning',
      label: TEST_SESSION_COPY.warnings,
      value: log.warnings,
      tone: LINE_TONES.warning,
    },
    {
      key: 'feature',
      label: TEST_SESSION_COPY.feature,
      value: log.feature,
      tone: LINE_TONES.feature,
    },
  ]
}

/**
 * The "Test with me" block on a run's sign-off, from the session read and what the person asked:
 * a press shows at once as starting or stopping, before the backend answers. `undefined` until
 * the session is read, and for a run with nothing to serve and no session kept. Pure.
 */
export function testSessionDisplay(state: TestSessionState): TestSessionDisplay | undefined {
  const { view } = state
  if (!view || (!view.offered && !view.session)) return undefined
  const session = view.session
  const shown = shownStatus(state, session)
  const action = actionOf(shown, view.offered, !!state.pending)
  const detail = detailOf(shown, session)
  const allLines = session?.log.lines ?? []
  const lines = allLines.slice(-TEST_SESSION_SHOWN_LINES)
  const hidden = allLines.length - lines.length
  const helper = helperOf(session)
  return {
    title: TEST_SESSION_COPY.title,
    headline: HEADLINES[shown],
    tone: TONES[shown],
    ...(detail ? { detail } : {}),
    ...(state.error ? { error: state.error } : {}),
    ...(action ? { action } : {}),
    ...(shown === 'running' && session?.url
      ? { open: { href: session.url, label: TEST_SESSION_COPY.open } }
      : {}),
    counts: countsOf(session),
    lines: lines.map((line, index) => ({
      key: `${line.at}-${hidden + index}`,
      role: line.role,
      kindLabel: TEST_SESSION_LINE_LABELS[line.kind],
      tone: LINE_TONES[line.kind],
      text: line.text,
    })),
    linesTitle: TEST_SESSION_COPY.linesTitle,
    linesEmpty: TEST_SESSION_COPY.linesEmpty,
    linesHidden: hidden,
    proof: [...(session?.proof ?? [])].reverse().map((item) => ({
      key: item.id,
      kindLabel: item.kind === 'record' ? TEST_SESSION_COPY.record : TEST_SESSION_COPY.event,
      label: item.label,
      ...(item.detail ? { detail: item.detail } : {}),
      meta: `${item.source} · ${item.environment ?? TEST_SESSION_COPY.noEnvironment}`,
    })),
    proofTitle: TEST_SESSION_COPY.proofTitle,
    proofEmpty: TEST_SESSION_COPY.proofEmpty,
    ...(helper ? { helper } : {}),
    picksAgent: action?.kind === 'start',
    showsFindings: !!session,
  }
}
