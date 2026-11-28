import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  createOverseerGithubRepo,
  createProject,
  createProjectGithubRepo,
  listOverseerAuthProviders,
  getResponseDataMessage,
} from '../../headless/api'
import type {
  GetProjectResponse,
  OverseerAuthProviders,
  ProjectDataLocation,
} from '../../headless/api'
import { useOverseer } from '../../headless'
import { useProjects } from '../../headless'
import Alert from '../primitives/Alert'
import { Button } from '../primitives/Button'
import Field from '../primitives/Field'
import { Input } from '../primitives/Input'
import { ConfirmDialog } from '../primitives/Modal'
import Surface from '../primitives/Surface'
import { IconArrowLeftMini } from '../icons'
import { useGithubSignIn } from '../../headless/hooks/useGithubSignIn'
import { GITHUB_SIGN_IN_TEXT } from '../../headless/utils/githubSignInConstants'

type Step =
  | 'chooser'
  | 'connect'
  | 'github-fresh-auth'
  | 'github-fresh-create'
  | 'local-only-confirm'
  | 'project-chooser'
  | 'project-import'
  | 'project-new-github-auth'
  | 'project-new-github-create'
  | 'project-new-local'

/**
 * First-run flow shown when the backend reports zero projects. Three paths:
 *
 * 1. **Connect to a git repository** — clone any URL; if the remote already
 *    has thefactory-overseer files, projects load automatically. If empty,
 *    the backend seeds it.
 * 2. **Create a fresh GitHub repository** — signs in with GitHub inside the
 *    app (falls back to "coming soon" when the backend has no GitHub sign-in
 *    set up), then creates the repository.
 * 3. **Use it locally only** — flagged risky; no remote, no off-machine
 *    backups. Gated on an "I understand" confirmation.
 *
 * The chooser is auto-skipped to `project-chooser` when
 * `hasRemote && projectCount === 0` — the user already configured a remote
 * on an earlier visit but hasn't created their first project yet.
 *
 * Splits into two components so the auto-skip decision is made *once* on
 * mount with overseer state in hand, instead of trying to correct it after
 * the fact (which would fight the user if they navigated back to the chooser).
 */
export default function WelcomeView() {
  const overseer = useOverseer()
  const authProviders = useAuthProviders()
  if (!overseer.isLoaded || !authProviders.isLoaded) return <LoadingShell />
  // If `getOverseer` errored, falling through to the chooser would silently
  // mis-frame this as "you've never set up". Surface the error instead so
  // the user can retry rather than redoing setup against a backend that's
  // about to come back.
  if (overseer.loadError || !overseer.state) {
    return (
      <div className="flex items-center justify-center h-full w-full p-6">
        <Surface className="flex flex-col gap-3 p-5 max-w-lg">
          <h2 className="text-lg font-semibold">Couldn’t load thefactory-overseer</h2>
          <Alert variant="error">
            {overseer.loadError?.message ??
              'The backend didn’t return overseer state. Check that it’s running and reachable, then refresh.'}
          </Alert>
          <Button variant="primary" onClick={() => void overseer.refresh()}>
            Retry
          </Button>
        </Surface>
      </div>
    )
  }
  // `setupCompleted` is the backend's persistent marker — flipped by every
  // setup path (set/clone remote, fresh-github, confirm-local-only) and
  // wiped by `resetOverseer`. We OR with `hasRemote` for two reasons: (1)
  // an overseer set up against an older backend (pre-marker) only carries
  // `hasRemote=true`; (2) belt-and-braces if a path forgets to flip the
  // marker, the remote alone proves the user set this up. `hasRemote=false`
  // overseers (local-only) rely on `setupCompleted` exclusively.
  const overseerSetUp = overseer.state.setupCompleted || overseer.state.hasRemote
  const initialStep: Step = overseerSetUp ? 'project-chooser' : 'chooser'
  return <WelcomeFlow initialStep={initialStep} authProviders={authProviders.value} />
}

/**
 * One-shot fetch of `auth-providers` so the chooser can decide which GitHub
 * card variant to show (sign-in CTA vs. "coming soon"). Only called
 * once on mount — the answer doesn't change at runtime, it's an env-time
 * config on the backend.
 */
function useAuthProviders(): {
  isLoaded: boolean
  value: OverseerAuthProviders
} {
  const [value, setValue] = useState<OverseerAuthProviders>({ providers: [], githubFlows: [] })
  const [isLoaded, setIsLoaded] = useState(false)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { data } = await listOverseerAuthProviders({ throwOnError: true })
        if (!cancelled) setValue(data)
      } catch {
        // Treat any failure as "no providers" — the chooser falls back to
        // showing the GitHub card as "Coming soon," which is the same UX
        // the operator gets when GitHub env isn't configured.
      } finally {
        if (!cancelled) setIsLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
  return { isLoaded, value }
}

function LoadingShell() {
  return (
    <div className="flex items-center justify-center h-full w-full p-6">
      <p className="text-sm opacity-70">Loading…</p>
    </div>
  )
}

function WelcomeFlow({
  initialStep,
  authProviders,
}: {
  initialStep: Step
  authProviders: OverseerAuthProviders
}) {
  const [step, setStep] = useState<Step>(initialStep)
  // tokenId acquired by the OAuth flow — kept here so the create-repo
  // step (which is a separate render) has access to it. Cleared on
  // back/success.
  const [overseerToken, setOverseerToken] = useState<string | null>(null)
  const [projectToken, setProjectToken] = useState<string | null>(null)

  const backToOverseerChooser = () => setStep('chooser')
  const backToProjectChooser = () => setStep('project-chooser')

  const githubAvailable = authProviders.githubFlows.length > 0

  // Once the overseer is committed, the user is "inside" it — no Back to the
  // overseer chooser. The banner's Change… affordance is the way out.
  const inProjectFlow =
    step === 'project-chooser' ||
    step === 'project-import' ||
    step === 'project-new-github-auth' ||
    step === 'project-new-github-create' ||
    step === 'project-new-local'

  return (
    <div className="flex items-center justify-center h-full w-full p-6 overflow-auto">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold">Welcome to thefactory-overseer</h1>
          <p className="text-sm opacity-70 mt-1">
            Your thefactory-overseer project is the central git repo that owns your projects’
            registry, credentials, and (for projects on the central data-location) their stories and
            chats. Pick how to set it up.
          </p>
        </header>

        {inProjectFlow && (
          <OverseerStatusBanner
            onReset={() => {
              setOverseerToken(null)
              setProjectToken(null)
              setStep('chooser')
            }}
          />
        )}

        {step === 'chooser' && <Chooser onPick={setStep} githubAvailable={githubAvailable} />}
        {step === 'connect' && (
          <ConnectOverseerForm
            onBack={backToOverseerChooser}
            onConnected={() => setStep('project-chooser')}
          />
        )}
        {step === 'github-fresh-auth' && githubAvailable && (
          <WelcomeGithubSignIn
            onBack={backToOverseerChooser}
            onAuthorized={(tokenId) => {
              setOverseerToken(tokenId)
              setStep('github-fresh-create')
            }}
          />
        )}
        {step === 'github-fresh-auth' && !githubAvailable && (
          <GithubFreshComingSoon onBack={backToOverseerChooser} />
        )}
        {step === 'github-fresh-create' && overseerToken && (
          <CreateOverseerRepoForm
            tokenId={overseerToken}
            onBack={() => {
              setOverseerToken(null)
              setStep('github-fresh-auth')
            }}
            onCreated={() => {
              setOverseerToken(null)
              setStep('project-chooser')
            }}
          />
        )}
        {step === 'local-only-confirm' && (
          <LocalOnlyConfirmation
            onBack={backToOverseerChooser}
            onContinue={() => setStep('project-chooser')}
          />
        )}
        {step === 'project-chooser' && (
          <ProjectChooser onPick={setStep} githubAvailable={githubAvailable} />
        )}
        {step === 'project-import' && <ImportProjectForm onBack={backToProjectChooser} />}
        {step === 'project-new-github-auth' && (
          <WelcomeGithubSignIn
            onBack={backToProjectChooser}
            onAuthorized={(tokenId) => {
              setProjectToken(tokenId)
              setStep('project-new-github-create')
            }}
          />
        )}
        {step === 'project-new-github-create' && projectToken && (
          <CreateProjectRepoForm
            tokenId={projectToken}
            onBack={() => {
              setProjectToken(null)
              setStep('project-new-github-auth')
            }}
            onCreated={() => {
              setProjectToken(null)
            }}
          />
        )}
        {step === 'project-new-local' && <NewProjectForm onBack={backToProjectChooser} />}
      </div>
    </div>
  )
}

function Chooser({
  onPick,
  githubAvailable,
}: {
  onPick: (step: Step) => void
  githubAvailable: boolean
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card
        title="Connect to a git repository"
        body="Paste any git URL. If the repository already has thefactory-overseer files, your projects load automatically. Recommended."
        cta="Connect…"
        onClick={() => onPick('connect')}
        tone="recommended"
      />
      <Card
        title="Create a fresh GitHub repository"
        body={
          githubAvailable
            ? 'Authorize this machine via GitHub and create a private repository for thefactory-overseer.'
            : 'Guide me through GitHub authentication and create a private repository for thefactory-overseer.'
        }
        cta={githubAvailable ? 'Use GitHub…' : 'Coming soon'}
        onClick={() => onPick('github-fresh-auth')}
        tone="default"
        comingSoon={!githubAvailable}
      />
      <Card
        title="Use it locally only"
        body="Risky — your overseer lives only on this machine. If it dies, projects, credentials, runs, and chats die with it."
        cta="Continue locally…"
        onClick={() => onPick('local-only-confirm')}
        tone="danger"
      />
    </div>
  )
}

type CardTone = 'recommended' | 'default' | 'danger'

function Card({
  title,
  body,
  cta,
  onClick,
  tone,
  comingSoon,
}: {
  title: string
  body: string
  cta: string
  onClick: () => void
  tone: CardTone
  comingSoon?: boolean
}) {
  const borderColor =
    tone === 'recommended'
      ? 'var(--accent-primary)'
      : tone === 'danger'
        ? 'var(--color-red-500)'
        : 'var(--border-subtle)'

  return (
    <Surface
      className="flex flex-col gap-3 p-5"
      style={{ borderColor, borderWidth: tone === 'default' ? 1 : 2 }}
    >
      {tone === 'recommended' && (
        <Tag background="var(--accent-primary)" color="white">
          Recommended
        </Tag>
      )}
      {tone === 'danger' && (
        <Tag background="var(--color-red-500)" color="white">
          Risky
        </Tag>
      )}
      {comingSoon && (
        <Tag background="var(--color-gray-400)" color="white">
          Coming soon
        </Tag>
      )}
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm opacity-70 flex-1">{body}</p>
      <Button
        variant={tone === 'danger' ? 'danger' : tone === 'recommended' ? 'primary' : 'secondary'}
        onClick={onClick}
        disabled={comingSoon}
      >
        {cta}
      </Button>
    </Surface>
  )
}

function Tag({
  background,
  color,
  children,
}: {
  background: string
  color: string
  children: ReactNode
}) {
  return (
    <span
      className="self-start text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
      style={{ background, color }}
    >
      {children}
    </span>
  )
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="self-start inline-flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
    >
      <IconArrowLeftMini className="w-3 h-3" />
      Back
    </button>
  )
}

function ConnectOverseerForm({
  onBack,
  onConnected,
}: {
  onBack: () => void
  onConnected: () => void
}) {
  const overseer = useOverseer()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    try {
      await overseer.clone(trimmed)
      // If the cloned remote already has projects, the WS broadcast will
      // refresh ProjectsContext and `AuthedRoot` will navigate us away from
      // this view. If it was empty, projectCount stays 0 and we'd be stuck
      // here; advance explicitly to the project chooser. Either way safe —
      // the unmount path wins the race.
      onConnected()
    } catch (err) {
      setError(extractCloneErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Surface as="form" onSubmit={submit} className="flex flex-col gap-4 p-5">
      <BackLink onBack={onBack} />
      <header>
        <h2 className="text-lg font-semibold">Connect to a git repository</h2>
        <p className="text-sm opacity-70">
          The backend will clone this repository into the overseer location. If it already has
          thefactory-overseer files, your projects load automatically. Otherwise the backend will
          initialise the structure and push the seed commit upstream.
        </p>
      </header>
      <Field label="Git URL">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="git@github.com:org/overseer.git"
          autoFocus
        />
      </Field>
      {error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" loading={busy} disabled={!url.trim()}>
        {busy ? 'Connecting…' : 'Connect'}
      </Button>
    </Surface>
  )
}

function GithubFreshComingSoon({ onBack }: { onBack: () => void }) {
  return (
    <Surface className="flex flex-col gap-4 p-5">
      <BackLink onBack={onBack} />
      <header>
        <h2 className="text-lg font-semibold">Create a fresh GitHub repository</h2>
        <p className="text-sm opacity-70">
          This path will guide you through GitHub authentication and create a private repository
          named <code>thefactory-overseer</code> on your behalf, then initialise it as your
          overseer.
        </p>
      </header>
      <Alert variant="info">
        GitHub authentication is not configured on this deployment. Set{' '}
        <code>GITHUB_CLIENT_ID</code>
        and <code>GITHUB_CLIENT_SECRET</code> on the backend to enable this path. For now, create a
        repository on GitHub yourself and use the <em>Connect to a git repository</em> path with its
        URL.
      </Alert>
    </Surface>
  )
}

/**
 * GitHub's own page shown inside the app, through the sign-in view: a press
 * opens it, the person is back here once it ends, and a finished sign-in hands
 * the token it left to `onAuthorized`. A sign-in that ran out or failed says
 * why; one the person closed goes back to the button.
 */
export function WelcomeGithubSignIn({
  onBack,
  onAuthorized,
}: {
  onBack: () => void
  onAuthorized: (tokenId: string) => void
}) {
  const github = useGithubSignIn('bootstrap')
  const { state } = github
  const tokenId = state.step === 'done' ? state.tokenId : undefined
  useEffect(() => {
    if (tokenId) onAuthorized(tokenId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId])

  return (
    <Surface className="flex flex-col gap-4 p-5">
      <BackLink onBack={onBack} />
      <header>
        <h2 className="text-lg font-semibold">Sign in with GitHub</h2>
        <p className="text-sm opacity-70">
          GitHub’s page opens here. Once you authorize this machine, you’ll name the repository.
        </p>
      </header>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Button variant="primary" onClick={github.start} loading={github.busy}>
        {GITHUB_SIGN_IN_TEXT.signIn}
      </Button>
    </Surface>
  )
}

/**
 * Post-auth form for the overseer setup. Calls `createOverseerGithubRepo`
 * with the tokenId the GitHub sign-in left.
 */
function CreateOverseerRepoForm({
  tokenId,
  onBack,
  onCreated,
}: {
  tokenId: string
  onBack: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('thefactory-overseer')
  const [isPrivate, setIsPrivate] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || creating) return
    setCreating(true)
    setError(null)
    try {
      await createOverseerGithubRepo({
        body: { tokenId, name: trimmed, private: isPrivate },
        throwOnError: true,
      })
      onCreated()
    } catch (err) {
      setError(extractGithubErrorMessage(err, 'Could not create the GitHub repository.'))
      setCreating(false)
    }
  }

  return (
    <Surface as="form" onSubmit={submit} className="flex flex-col gap-4 p-5">
      <BackLink onBack={onBack} />
      <header>
        <h2 className="text-lg font-semibold">Create a fresh GitHub repository</h2>
        <p className="text-sm opacity-70">
          GitHub authorized this machine. Pick a repository name; we’ll create it under your
          account, push the seed commit, then drop the access token from <code>.git/config</code>.
        </p>
      </header>
      {error && <Alert variant="error">{error}</Alert>}
      <Field label="Repository name">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
        />
        <span>Private repository (recommended)</span>
      </label>
      <Button type="submit" loading={creating} disabled={!name.trim()}>
        {creating ? 'Creating…' : 'Create repository'}
      </Button>
    </Surface>
  )
}

/**
 * Post-auth form for the project flow. Submits project metadata + repo
 * settings to `createProjectGithubRepo` (with the `projectMeta` body
 * shape, so the backend creates the repo and registers the project in a
 * single round-trip), then advances to the active project via
 * `setActiveProjectId` — the same handoff `ImportProjectForm` uses.
 */
function CreateProjectRepoForm({
  tokenId,
  onBack,
  onCreated,
}: {
  tokenId: string
  onBack: () => void
  onCreated: () => void
}) {
  const { refresh, setActiveProjectId } = useProjects()

  const [id, setId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [repoName, setRepoName] = useState('')
  const [repoNameTouched, setRepoNameTouched] = useState(false)
  const [isPrivate, setIsPrivate] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Default the repo name to the project id so the user only types one
  // identifier in most cases. Stops mirroring the moment they edit the
  // repo name themselves.
  const effectiveRepoName = repoNameTouched ? repoName : id

  const trimmedId = id.trim()
  const trimmedTitle = title.trim()
  const trimmedDesc = description.trim()
  const trimmedRepoName = effectiveRepoName.trim()
  const canSubmit =
    trimmedId.length > 0 &&
    trimmedTitle.length > 0 &&
    trimmedDesc.length > 0 &&
    trimmedRepoName.length > 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || creating) return
    setCreating(true)
    setError(null)
    try {
      const { data: created } = await createProjectGithubRepo({
        body: {
          tokenId,
          name: trimmedRepoName,
          private: isPrivate,
          projectMeta: {
            id: trimmedId,
            title: trimmedTitle,
            description: trimmedDesc,
          },
        },
        throwOnError: true,
      })
      const project: GetProjectResponse = created
      await refresh()
      setActiveProjectId(project.id)
      onCreated()
    } catch (err) {
      setError(extractGithubErrorMessage(err, 'Could not create the GitHub repository.'))
      setCreating(false)
    }
  }

  return (
    <Surface as="form" onSubmit={submit} className="flex flex-col gap-4 p-5">
      <BackLink onBack={onBack} />
      <header>
        <h2 className="text-lg font-semibold">Create a fresh GitHub repository for this project</h2>
        <p className="text-sm opacity-70">
          GitHub authorized this machine. Fill in the project details; we’ll create the repository
          under your account, push the seed commit, register the project, and drop the access token
          from <code>.git/config</code>.
        </p>
      </header>
      {error && <Alert variant="error">{error}</Alert>}
      <Field label="Project ID" hint="A short stable identifier (e.g. my-app).">
        <Input value={id} onChange={(e) => setId(e.target.value)} autoFocus />
      </Field>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Description">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field
        label="Repository name"
        hint="Defaults to the project ID. Edit if you want them to differ."
      >
        <Input
          value={effectiveRepoName}
          onChange={(e) => {
            setRepoNameTouched(true)
            setRepoName(e.target.value)
          }}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
        />
        <span>Private repository (recommended)</span>
      </label>
      <Button type="submit" loading={creating} disabled={!canSubmit}>
        {creating ? 'Creating…' : 'Create repository'}
      </Button>
    </Surface>
  )
}

function extractGithubErrorMessage(err: unknown, fallback: string): string {
  // Backend uses `{ error: string }` for GitHub repo creation errors. Fall
  // through to `message` (older
  // overseer envelopes) and finally the transport error message.
  const responseError = (() => {
    if (!err || typeof err !== 'object') return undefined
    const data = (err as { response?: { data?: unknown } }).response?.data
    if (!data || typeof data !== 'object') return undefined
    const e = (data as { error?: unknown }).error
    return typeof e === 'string' ? e : undefined
  })()
  return (
    responseError ?? getResponseDataMessage(err) ?? (err instanceof Error ? err.message : fallback)
  )
}

function LocalOnlyConfirmation({
  onBack,
  onContinue,
}: {
  onBack: () => void
  onContinue: () => void
}) {
  const { confirmLocalOnly } = useOverseer()
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!acknowledged || busy) return
    setBusy(true)
    setError(null)
    try {
      await confirmLocalOnly()
      onContinue()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the local-only setup choice.')
      setBusy(false)
    }
  }

  return (
    <Surface className="flex flex-col gap-4 p-5">
      <BackLink onBack={onBack} />
      <header>
        <h2 className="text-lg font-semibold">Use thefactory-overseer locally only</h2>
      </header>
      <Alert variant="error">
        Your overseer will live only on this machine. The daily squash commits locally but never
        pushes anywhere. If this machine dies, fails, or is wiped, your projects’ registry,
        credentials, agent runs, and (for projects on the central data-location) their stories and
        chats are <strong>gone</strong>. There is no recovery path.
      </Alert>
      <p className="text-sm opacity-70">
        You can attach a remote later from <em>Settings → Overseer</em>, but only before the machine
        is lost.
      </p>
      <label className="flex items-start gap-2 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-1"
        />
        <span>I understand the risk and want to continue without a remote.</span>
      </label>
      {error && <Alert variant="error">{error}</Alert>}
      <Button variant="danger" onClick={submit} loading={busy} disabled={!acknowledged || busy}>
        Continue locally
      </Button>
    </Surface>
  )
}

/**
 * Header shown above all `project-*` steps. Once the overseer is committed,
 * the user is "inside" it — backing out to the overseer chooser would be
 * misleading. This banner makes the active overseer visible and exposes
 * `Change overseer…` which archives the current overseer and routes back
 * to the welcome chooser via the `overseer:updated` WS broadcast.
 */
function OverseerStatusBanner({ onReset }: { onReset: () => void }) {
  const { state, reset } = useOverseer()
  const [confirming, setConfirming] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  if (!state) return null
  const remoteLine = state.hasRemote ? (state.remoteUrl ?? 'Configured') : 'No remote — local only'
  return (
    <Surface className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs uppercase tracking-wider opacity-60">Currently using</span>
          <span className="text-sm font-medium truncate" title={state.path}>
            {state.path}
          </span>
          <span className="text-xs opacity-70 truncate" title={remoteLine}>
            {remoteLine}
          </span>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setResetError(null)
            setConfirming(true)
          }}
        >
          Change overseer…
        </Button>
      </div>
      {resetError && <Alert variant="error">{resetError}</Alert>}
      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          try {
            await reset()
            onReset()
          } catch (err) {
            setResetError(
              err instanceof Error ? err.message : 'Could not archive the current overseer.',
            )
          }
        }}
        title="Switch to a different overseer?"
        description={
          state.hasRemote
            ? 'The current overseer is archived locally (recoverable from the host’s archive directory). The remote is left untouched, so you can re-clone it later if you change your mind.'
            : 'The current overseer is archived locally (recoverable from the host’s archive directory). It has no remote, so once archived it only exists in the archive directory — back it up first if you need it.'
        }
        confirmLabel="Archive and switch"
        cancelLabel="Cancel"
        destructive
      />
    </Surface>
  )
}

/**
 * Project setup chooser shown after the overseer is committed. Three paths:
 *
 *   - **Import existing** — paste a git URL; backend clones it (and seeds
 *     it with the project's overseer files if missing).
 *   - **Set up new on a fresh GitHub repo** — signs in with GitHub inside the
 *     app, then creates the repo and the project in one backend round-trip.
 *     Hidden when GitHub sign-in isn't set up.
 *   - **Set up new locally** — register the project metadata only. A repo
 *     can be linked later from Settings → Repository.
 */
function ProjectChooser({
  onPick,
  githubAvailable,
}: {
  onPick: (step: Step) => void
  githubAvailable: boolean
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card
        title="Import an existing project"
        body="Paste a git URL. We’ll clone it; if the repository already has overseer files, they load automatically."
        cta="Import…"
        onClick={() => onPick('project-import')}
        tone="default"
      />
      <Card
        title="Set up a new project on a fresh GitHub repository"
        body={
          githubAvailable
            ? 'Authorize GitHub once, then we’ll create a fresh repository and register the project in one step.'
            : 'GitHub authentication isn’t configured on this deployment.'
        }
        cta={githubAvailable ? 'Use GitHub…' : 'Coming soon'}
        onClick={() => onPick('project-new-github-auth')}
        tone="recommended"
        comingSoon={!githubAvailable}
      />
      <Card
        title="Set up a new project locally"
        body="Just register the project metadata. You can link a git repository later from Settings → Repository."
        cta="Set up…"
        onClick={() => onPick('project-new-local')}
        tone="default"
      />
    </div>
  )
}

/**
 * Import an existing project from a git URL. The repo URL is required here
 * (use the New form for repo-less projects). When the user provides a URL,
 * the in-project data location becomes available — for the central default,
 * the overseer holds the project's stories and chats.
 */
function ImportProjectForm({ onBack }: { onBack: () => void }) {
  const { refresh, setActiveProjectId } = useProjects()

  const [id, setId] = useState('')
  // The id mirrors the URL's trailing segment until the user types in the
  // id field. Mirroring stays cheap (no effect, no race) by deriving on
  // every render from the current URL — the moment the user touches the
  // id input we lock it.
  const [idTouched, setIdTouched] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [dataLocation, setDataLocation] = useState<ProjectDataLocation>('central')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedRepo = repoUrl.trim()
  const effectiveId = idTouched ? id : deriveProjectIdFromRepoUrl(trimmedRepo)
  const canSubmit =
    effectiveId.trim().length > 0 &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    trimmedRepo.length > 0

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const { data: created } = await createProject({
        body: {
          id: effectiveId.trim(),
          title: title.trim(),
          description: description.trim(),
          repo_url: trimmedRepo,
          dataLocation,
        },
        throwOnError: true,
      })
      const project: GetProjectResponse = created
      await refresh()
      setActiveProjectId(project.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import project')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Surface as="form" onSubmit={onSubmit} className="flex flex-col gap-4 p-5">
      <BackLink onBack={onBack} />
      <header>
        <h2 className="text-lg font-semibold">Import an existing project</h2>
        <p className="text-sm opacity-70">
          The backend will clone this repository and register it as a project.
        </p>
      </header>

      {error && <Alert variant="error">{error}</Alert>}

      <Field label="Git repository URL">
        <Input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/org/repo.git"
          autoFocus
        />
      </Field>
      <Field
        label="Project ID"
        hint="A short stable identifier (e.g. my-app). Defaults to the repository name — edit if you want them to differ."
      >
        <Input
          value={effectiveId}
          onChange={(e) => {
            setIdTouched(true)
            setId(e.target.value)
          }}
        />
      </Field>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Description">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <details className="text-sm">
        <summary className="cursor-pointer opacity-80">Advanced</summary>
        <div className="mt-3 flex flex-col gap-2">
          <span className="text-sm font-medium">Data location</span>
          <span className="text-xs opacity-70">
            Where this project’s stories and chats are kept. Switchable later in Settings.
          </span>
          <DataLocationRadios value={dataLocation} onChange={setDataLocation} inProjectAvailable />
        </div>
      </details>

      <Button type="submit" loading={submitting} disabled={!canSubmit}>
        Import project
      </Button>
    </Surface>
  )
}

/**
 * Register a project metadata-only. No repo is linked at creation time;
 * the user can attach one later from Settings → Repository. The GitHub
 * "create a fresh repo for this project" path is its own card on the
 * project chooser — see {@link CreateProjectRepoForm}.
 */
function NewProjectForm({ onBack }: { onBack: () => void }) {
  const { refresh, setActiveProjectId } = useProjects()

  const [id, setId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = id.trim().length > 0 && title.trim().length > 0 && description.trim().length > 0

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const { data: created } = await createProject({
        body: {
          id: id.trim(),
          title: title.trim(),
          description: description.trim(),
          dataLocation: 'central',
        },
        throwOnError: true,
      })
      const project: GetProjectResponse = created
      await refresh()
      setActiveProjectId(project.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Surface as="form" onSubmit={onSubmit} className="flex flex-col gap-4 p-5">
      <BackLink onBack={onBack} />
      <header>
        <h2 className="text-lg font-semibold">Set up a new project locally</h2>
        <p className="text-sm opacity-70">
          Register a new project. You can link a git repository later from Settings → Repository.
        </p>
      </header>

      {error && <Alert variant="error">{error}</Alert>}

      <Field label="Project ID" hint="A short stable identifier (e.g. my-app).">
        <Input value={id} onChange={(e) => setId(e.target.value)} autoFocus />
      </Field>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Description">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <Button type="submit" loading={submitting} disabled={!canSubmit}>
        Create project
      </Button>
    </Surface>
  )
}

function DataLocationRadios({
  value,
  onChange,
  inProjectAvailable,
}: {
  value: ProjectDataLocation
  onChange: (next: ProjectDataLocation) => void
  inProjectAvailable: boolean
}) {
  return (
    <fieldset className="flex flex-col gap-2 mt-1">
      {DATA_LOCATION_OPTIONS.map((opt) => {
        const locked = opt.value === 'inProject' && !inProjectAvailable
        return (
          <label
            key={opt.value}
            title={locked ? IN_PROJECT_DISABLED_HINT : undefined}
            className="flex items-start gap-3"
            style={{
              cursor: locked ? 'not-allowed' : 'pointer',
              opacity: locked ? 0.5 : 1,
            }}
          >
            <input
              type="radio"
              name="data-location"
              value={opt.value}
              checked={value === opt.value}
              disabled={locked}
              onChange={() => onChange(opt.value)}
              className="mt-1"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{opt.title}</span>
              <span className="text-xs opacity-70">
                {locked ? IN_PROJECT_DISABLED_HINT : opt.hint}
              </span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}

const DATA_LOCATION_OPTIONS: ReadonlyArray<{
  value: ProjectDataLocation
  title: string
  hint: string
}> = [
  {
    value: 'central',
    title: 'Keep with thefactory-overseer project (recommended)',
    hint: 'Stories and chats live alongside other metadata in your thefactory-overseer project.',
  },
  {
    value: 'inProject',
    title: 'Keep inside this project’s git repository',
    hint: 'Stories and chats are committed to this project’s repository and travel with its git history.',
  },
]

const IN_PROJECT_DISABLED_HINT = 'Add a git repository URL above to enable this option.'

/**
 * Derive a project id from a git remote URL by taking its last path
 * segment and stripping a trailing `.git`. Handles both HTTPS
 * (`https://github.com/org/repo.git`) and SSH (`git@github.com:org/repo.git`)
 * forms by splitting on either `/` or `:`. Returns `''` for empty input —
 * the caller is responsible for treating that as "no suggestion yet".
 */
function deriveProjectIdFromRepoUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  const segments = trimmed.split(/[/:]/)
  const last = segments[segments.length - 1] ?? ''
  return last.replace(/\.git$/i, '')
}

function extractCloneErrorMessage(err: unknown): string {
  // 409 returns `OverseerNotEmptyError` ({ error, message, projectCount,
  // commitCount }) — surface `message` verbatim. Fall through to the
  // transport error message otherwise.
  return (
    getResponseDataMessage(err) ??
    (err instanceof Error ? err.message : 'Could not connect to the thefactory-overseer.')
  )
}
