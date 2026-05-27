import { useCallback, useEffect, useRef, useState } from 'react'
import { getDbHealth, startDb, type GetDbHealthResponse } from '../../../headless/api/generated'
import { Button } from '../..'
import { Surface } from '../..'

type DbHealth = GetDbHealthResponse
type DbPhase = NonNullable<DbHealth['phase']>
type DbErrorCategory = NonNullable<DbHealth['errorCategory']>

export default function DbHealthPanel() {
  const [status, setStatus] = useState<DbHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  // AbortController per probe — StrictMode's double-invoke cancels its own
  // first request, and the manual Re-check button cancels any in-flight
  // probe so the spinner reflects the latest action.
  const abortRef = useRef<AbortController | null>(null)

  const probe = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setFetchError(null)
    try {
      const { data } = await getDbHealth({
        signal: controller.signal,
        throwOnError: true,
      })
      if (controller.signal.aborted) return
      setStatus(data as DbHealth)
    } catch (err) {
      if (controller.signal.aborted) return
      setFetchError(err instanceof Error ? err.message : String(err))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  const startContainer = useCallback(async () => {
    setStarting(true)
    setStartError(null)
    try {
      const { data } = await startDb({ throwOnError: true })
      // The POST endpoint returns the fresh health payload so we don't pay
      // a second round-trip for the new state.
      setStatus((data as { health: DbHealth }).health)
      const initResult = (data as { initResult: { ok: boolean; error?: string } }).initResult
      if (!initResult.ok && initResult.error) {
        // Container start succeeded but backend init still failed — keep
        // the start-error banner so the operator sees both signals.
        setStartError(`Container started but backend init failed: ${initResult.error}`)
      }
    } catch (err) {
      // hey-api throws on non-2xx with a JSON body; surface its `error`
      // field verbatim — that's what carries the operator-facing reason.
      const msg = extractErrorMessage(err)
      setStartError(msg)
    } finally {
      setStarting(false)
    }
  }, [])

  useEffect(() => {
    void probe()
    return () => abortRef.current?.abort()
  }, [probe])

  const canStart = canOfferStart(status)

  return (
    <Surface className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Database connection</h2>
        <div className="flex items-center gap-2">
          {canStart && (
            <Button size="sm" onClick={() => void startContainer()} disabled={starting || loading}>
              {starting ? 'Starting…' : 'Start DB container'}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => void probe()} disabled={loading || starting}>
            {loading ? 'Checking…' : 'Re-check'}
          </Button>
        </div>
      </div>
      <p className="text-[12px] text-(--text-secondary)">
        Three independent signals — Docker, raw connectivity, and backend
        initialisation. Entities, ingestion, and document search all need the
        last one to be green.
      </p>

      {loading && !status && <div className="text-sm text-(--text-secondary)">Checking…</div>}

      {fetchError && (
        <div className="text-sm text-(--text-error)">
          Could not reach backend health endpoint: {fetchError}
        </div>
      )}

      {startError && (
        <div className="rounded border border-(--status-error)/40 bg-(--status-error)/5 p-3 text-[12px]">
          <div className="font-medium text-(--text-primary)">Could not start the DB</div>
          <pre className="mt-1 max-w-full overflow-x-auto whitespace-pre-wrap text-[11px] text-(--text-secondary)">
            {startError}
          </pre>
        </div>
      )}

      {status && (
        <div className="flex flex-col gap-3">
          <DockerSection status={status} />
          <ConnectionSection status={status} />
          <InitialisationSection status={status} />
          {!status.connected && status.error && <ErrorHint status={status} />}
        </div>
      )}
    </Surface>
  )
}

/**
 * The Start button is only meaningful when the operator action exists in
 * the backend's control: Docker is up, the container exists, and either
 * it's stopped OR the backend isn't yet connected. We never offer it when
 * the container is missing (operator needs `docker compose up -d` first)
 * or Docker itself is down.
 */
function canOfferStart(status: DbHealth | null): boolean {
  if (!status) return false
  if (!status.configured) return false
  if (!status.docker) return false
  if (!status.docker.installed) return false
  const c = status.docker.container
  if (!c) return false
  if (!c.exists) return false
  // Either container is stopped, or it's running but the backend hasn't
  // initialised (e.g. boot-time connect timed out and the operator wants
  // to retry without restarting the backend).
  return !c.running || !status.initialized
}

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { error?: string } }; message?: string }
    if (typeof e.response?.data?.error === 'string') return e.response.data.error
    if (typeof e.message === 'string') return e.message
  }
  return String(err)
}

function DockerSection({ status }: { status: DbHealth }) {
  const docker = status.docker
  if (!docker) return null
  if (!docker.installed) {
    return (
      <Indicator tone="error" label="Docker not running">
        Either Docker isn't installed or the daemon isn't running.{' '}
        <Hint>Start Docker Desktop and re-check.</Hint>
      </Indicator>
    )
  }
  const container = docker.container
  if (!container) {
    return (
      <Indicator tone="ok" label="Docker running">
        No DB container name configured.
      </Indicator>
    )
  }
  if (!container.exists) {
    return (
      <Indicator tone="error" label={`Container '${container.name}' missing`}>
        Docker is running but the DB container hasn't been created yet.{' '}
        <Hint>
          <code>cd thefactory-db && docker compose up -d</code>
        </Hint>
      </Indicator>
    )
  }
  if (!container.running) {
    return (
      <Indicator tone="error" label={`Container '${container.name}' stopped`}>
        The DB container exists but is stopped.{' '}
        <Hint>
          <code>docker start {container.name}</code>
        </Hint>
      </Indicator>
    )
  }
  return (
    <Indicator tone="ok" label={`Container '${container.name}' running`}>
      Docker is healthy and the DB container is up.
    </Indicator>
  )
}

function ConnectionSection({ status }: { status: DbHealth }) {
  if (!status.configured) {
    return (
      <Indicator tone="muted" label="Not configured">
        No <code>DATABASE_URL</code> set on the backend. DB-backed features stay
        unavailable until one is configured and the backend is restarted.
      </Indicator>
    )
  }
  if (status.connected) {
    return (
      <Indicator tone="ok" label="Connected">
        A trivial round-trip query just succeeded against the database.
      </Indicator>
    )
  }
  return (
    <Indicator tone="error" label="Disconnected">
      Backend can't reach the database right now.
    </Indicator>
  )
}

function InitialisationSection({ status }: { status: DbHealth }) {
  if (!status.configured) return null
  const phase = (status.phase ?? 'idle') as DbPhase
  const tone: 'ok' | 'error' | 'muted' = status.initialized
    ? 'ok'
    : phase === 'error'
      ? 'error'
      : 'muted'
  const label = PHASE_LABEL[phase] ?? phase
  return (
    <Indicator tone={tone} label={`Backend init: ${label}`}>
      {phase === 'ready' &&
        'Migrations are applied and the backend is serving DB-backed routes.'}
      {phase === 'connecting' &&
        "Backend is still bringing up its database layer. DB-backed routes will respond once this finishes."}
      {phase === 'idle' &&
        "Backend hasn't tried to open the database yet — typically only seen right after start."}
      {phase === 'error' &&
        "Backend tried to initialise the database and failed. It will retry on the next request that needs the DB, or you can restart."}
      {phase === 'unconfigured' && 'No DATABASE_URL configured.'}
    </Indicator>
  )
}

const PHASE_LABEL: Record<DbPhase, string> = {
  unconfigured: 'not configured',
  idle: 'idle',
  connecting: 'connecting…',
  ready: 'ready',
  error: 'failed',
}

function ErrorHint({ status }: { status: DbHealth }) {
  const cat = status.errorCategory as DbErrorCategory | undefined
  const hint = cat ? CATEGORY_HINT[cat] : null
  return (
    <div className="rounded border border-(--status-error)/40 bg-(--status-error)/5 p-3 text-[12px] text-(--text-secondary)">
      <div className="font-medium text-(--text-primary)">What to try</div>
      {hint && <div className="mt-1">{hint}</div>}
      {status.error && (
        <pre className="mt-2 max-w-full overflow-x-auto rounded bg-(--surface-sunken) p-2 text-[11px]">
          {status.error}
        </pre>
      )}
    </div>
  )
}

const CATEGORY_HINT: Record<DbErrorCategory, React.ReactNode> = {
  unreachable: (
    <>
      The backend can't reach the Postgres host or port. Check that the DB
      container is running and that <code>DATABASE_URL</code> points at the
      same host+port the container exposes (default <code>localhost:55432</code>
      ).
    </>
  ),
  auth: (
    <>
      The backend reached Postgres but the credentials were rejected. Check the
      user / password in <code>DATABASE_URL</code> against
      <code>thefactory-db/docker-compose.yml</code>.
    </>
  ),
  'database-missing': (
    <>
      Postgres is up but the named database doesn't exist. Either correct the
      <code>DATABASE_URL</code> path or create the database
      (<code>docker compose up -d</code> in <code>thefactory-db/</code> should
      provision it).
    </>
  ),
  timeout: (
    <>
      The probe gave up before Postgres replied. Often means the host is
      unreachable (firewall / wrong host), or that <em>backend init</em> is
      still running migrations — see the <em>Backend init</em> row above.
    </>
  ),
  unknown: (
    <>
      Unrecognised error. Read the message below and check the backend
      terminal for stack traces.
    </>
  ),
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="text-(--text-secondary)">{children}</span>
}

function Indicator({
  tone,
  label,
  children,
}: {
  tone: 'ok' | 'error' | 'muted'
  label: string
  children: React.ReactNode
}) {
  const dotClass =
    tone === 'ok'
      ? 'bg-(--status-success)'
      : tone === 'error'
        ? 'bg-(--status-error)'
        : 'bg-(--text-muted)'
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass}`} />
        {label}
      </div>
      <div className="text-[12px] text-(--text-secondary)">{children}</div>
    </div>
  )
}
