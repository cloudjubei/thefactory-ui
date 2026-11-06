import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  ChatsProvider,
  LLMConfigsProvider,
  ProjectsGroupsProvider,
  ProjectsProvider,
  StoriesProvider,
  useApi,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import { client } from '../../src/headless/api/generated/client.gen'
import { FAKE_CLI_RUN } from '../../src/fakeBackend/fixtures/cliRuns'
import { FAKE_LLM_CONFIGS } from '../../src/fakeBackend/fixtures/models'
import { FAKE_PROCESSES, fakeProcessRunsMatching } from '../../src/fakeBackend/fixtures/processRuns'
import { FAKE_GROUPS, FAKE_PROJECTS } from '../../src/fakeBackend/fixtures/projects'
import {
  FAKE_GROUP_CONSTELLATION,
  FAKE_GROUP_STATUS,
} from '../../src/fakeBackend/fixtures/projectsGroups'
import { FAKE_STORIES_BY_PROJECT } from '../../src/fakeBackend/fixtures/stories'

const noop = () => {}
const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const TOKEN = 'fake-playground'
const BASE_URL = 'http://fake-backend.invalid'

/**
 * What one read in the page is answered with. Throw to answer 404. A write is
 * answered only where a state names it, as `POST /api/v1/…`, and is passed its
 * body: nothing here remembers it.
 */
export type FixtureRoutes = Readonly<
  Record<
    string,
    (params: Record<string, string>, query: URLSearchParams, body?: unknown) => unknown
  >
>

/** The reads the connected scenes make, answered from the fake backend's fixtures. */
const FIXTURE_ROUTES: FixtureRoutes = {
  '/health/startup': () => ({ serving: true, ready: true }),
  '/api/v1/projects': () => FAKE_PROJECTS,
  '/api/v1/projects-groups': () => FAKE_GROUPS,
  '/api/v1/projects-groups/{id}/status': () => FAKE_GROUP_STATUS,
  '/api/v1/projects-groups/{id}/constellation': () => FAKE_GROUP_CONSTELLATION,
  '/api/v1/projects/{projectId}/stories': ({ projectId }) =>
    FAKE_STORIES_BY_PROJECT[projectId ?? ''] ?? [],
  '/api/v1/projects/{projectId}/data': () => [],
  '/api/v1/process-runs': (_, query) => fakeProcessRunsMatching(query),
  '/api/v1/processes': () => FAKE_PROCESSES,
  '/api/v1/processes/capabilities': () => ({
    kinds: ['agent', 'check', 'gate'],
    implemented: ['agent', 'check', 'gate'],
  }),
  '/api/v1/cli-runs/{runId}': () => FAKE_CLI_RUN,
  '/api/v1/llm-configs': () => FAKE_LLM_CONFIGS,
  '/api/v1/settings/{key}': ({ key }) => ({ key, value: null }),
  '/api/v1/chats/summaries': () => [],
}

function paramsOf(pattern: string, pathname: string): Record<string, string> | undefined {
  const wanted = pattern.split('/')
  const actual = pathname.split('/')
  if (wanted.length !== actual.length) return undefined
  const params: Record<string, string> = {}
  for (const [index, segment] of wanted.entries()) {
    const value = actual[index] ?? ''
    if (segment.startsWith('{')) params[segment.slice(1, -1)] = decodeURIComponent(value)
    else if (segment !== value) return undefined
  }
  return params
}

function queryOf(url: URL, params: unknown): URLSearchParams {
  const query = new URLSearchParams(url.search)
  for (const [key, value] of Object.entries((params ?? {}) as Record<string, unknown>)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== null) query.append(key, String(item))
    }
  }
  return query
}

function answerOf(
  routes: FixtureRoutes,
  url: URL,
  query: URLSearchParams,
  method: string,
  body: unknown,
): unknown {
  for (const [pattern, answer] of [...Object.entries(routes), ...Object.entries(FIXTURE_ROUTES)]) {
    const [verb, path] = pattern.includes(' ') ? pattern.split(' ') : ['GET', pattern]
    const params = verb === method ? paramsOf(path ?? '', url.pathname) : undefined
    if (params) return answer(params, query, body)
  }
  throw new Error(`No fixture for ${method} ${url.pathname}`)
}

function bodyOf(data: unknown): unknown {
  return typeof data === 'string' ? JSON.parse(data) : data
}

/** Answers the SDK in the page from the fixtures: reads and the writes a state names, nothing on the network. */
const answerInPage =
  (routes: FixtureRoutes): AxiosAdapter =>
  async (config) => {
    const url = new URL(config.url ?? '', BASE_URL)
    const response: AxiosResponse = { data: null, status: 200, statusText: '', headers: {}, config }
    try {
      const method = (config.method ?? 'get').toUpperCase()
      const query = queryOf(url, config.params)
      const data = await answerOf(routes, url, query, method, bodyOf(config.data))
      return { ...response, data }
    } catch (err) {
      throw new AxiosError(String(err), undefined, config, undefined, { ...response, status: 404 })
    }
  }

/**
 * A connected view on the fake backend's fixtures: the real hooks and providers,
 * reading the data the clients read when they run against the fake. A state stays
 * fixed-data — the answers are in the page, and no clock or socket is involved.
 */
export function OnFixtures({
  routes = {},
  wsBaseUrl = null,
  children,
}: {
  /** Answers this state gives before the fixtures', for a record they do not hold. */
  routes?: FixtureRoutes
  /** A socket to listen on. Left out, no socket is opened and nothing arrives live. */
  wsBaseUrl?: string | null
  children: ReactNode
}) {
  client.setConfig({ adapter: answerInPage(routes) })
  return (
    <AuthProvider storage={{ read: () => TOKEN, write: noop }}>
      <ApiProvider apiBaseUrl={BASE_URL} wsBaseUrl={wsBaseUrl} client="web">
        <AppSettingsProvider storage={MEMORY}>
          <ProjectsProvider>
            <ProjectsGroupsProvider>
              <LLMConfigsProvider storage={MEMORY}>
                <StoriesProvider>
                  <ChatsProvider>{children}</ChatsProvider>
                </StoriesProvider>
              </LLMConfigsProvider>
            </ProjectsGroupsProvider>
          </ProjectsProvider>
        </AppSettingsProvider>
      </ApiProvider>
    </AuthProvider>
  )
}

type ListenedSocket = { onMessage: (message: { data: string }) => void }

/**
 * Tells the socket's listeners what the backend would have sent, through the
 * client's own message handling, then shows what it wraps: what it wraps reads
 * what was heard, as it would after the events arrived.
 */
export function Heard({
  events,
  children,
}: {
  events: readonly { event: string; data: unknown }[]
  children: ReactNode
}) {
  const { ws } = useApi()
  const [told, setTold] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const socket = ws as unknown as ListenedSocket
      for (const event of events) socket.onMessage({ data: JSON.stringify(event) })
      setTold(true)
    })
    return () => window.clearTimeout(timer)
  }, [ws, events])
  return told ? children : null
}

function pick(select: HTMLSelectElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, value)
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Chooses a value in each named picker of what it wraps once the picker offers
 * it, as a person would: the view keeps its filters to itself.
 */
export function Picked({
  choices,
  children,
}: {
  choices: Readonly<Record<string, string>>
  children: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = root.current
    if (!element) return
    const left = new Map(Object.entries(choices))
    const tryPick = () => {
      for (const [label, value] of left) {
        const select = element.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)
        if (!select || ![...select.options].some((option) => option.value === value)) continue
        left.delete(label)
        pick(select, value)
      }
      if (left.size === 0) observer.disconnect()
    }
    const observer = new MutationObserver(tryPick)
    observer.observe(element, { childList: true, subtree: true })
    tryPick()
    return () => observer.disconnect()
  }, [choices])
  return (
    <div ref={root} className="contents">
      {children}
    </div>
  )
}

/** One thing a person does: types into a labelled field, or presses a button by its words. */
export type SceneStep = { fill: string; value: string } | { press: string }

const STEP_GAP_MS = 60

function fill(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function doStep(element: HTMLElement, step: SceneStep): boolean {
  if ('fill' in step) {
    const input = element.querySelector<HTMLInputElement>(`input[aria-label="${step.fill}"]`)
    if (input) fill(input, step.value)
    return input !== null
  }
  const button = [...element.querySelectorAll('button')].find((candidate) =>
    (candidate.getAttribute('aria-label') ?? candidate.textContent)?.includes(step.press),
  )
  button?.click()
  return button !== undefined
}

/**
 * Does what a person would, a step at a time, each once it can be done: what
 * the state is about happens after a press the view keeps to itself.
 */
export function Acted({ steps, children }: { steps: readonly SceneStep[]; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const script = useRef(steps)
  useEffect(() => {
    const element = root.current
    if (!element) return
    const left = [...script.current]
    let timer: number | undefined
    const tryStep = () => {
      timer = undefined
      const step = left[0]
      if (!step) return observer.disconnect()
      if (doStep(element, step)) left.shift()
      if (left.length === 0) return observer.disconnect()
      timer = window.setTimeout(tryStep, STEP_GAP_MS)
    }
    const observer = new MutationObserver(() => {
      if (timer === undefined) timer = window.setTimeout(tryStep, STEP_GAP_MS)
    })
    observer.observe(element, { childList: true, subtree: true })
    tryStep()
    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
  }, [])
  return (
    <div ref={root} className="contents">
      {children}
    </div>
  )
}
