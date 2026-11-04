import {
  VIDEO_SETUP_TEXT,
  useVideoSetup,
  type VideoSetupRow,
  type VideoSetupStopTarget,
  type VideoSetupView,
} from '../../../headless'
import type { ChatContext } from '../../../headless/api'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import InlineStopConfirm from '../chips/InlineStopConfirm'
import SetUpWithAgentButton from '../chips/SetUpWithAgentButton'
import ToneBadge from '../chips/ToneBadge'
import { TerminalOutput } from '../TerminalOutput'

export type VideoSettingsPanelProps = {
  view: VideoSetupView | undefined
  checking: boolean
  loadError?: string
  agentError?: string
  agentStarting?: boolean
  onRecheck: () => void
  onInstall: (tool: 'ffmpeg' | 'whisper') => void
  onDownloadModels: () => void
  onStop: (target: VideoSetupStopTarget) => void
  onAskAgent: () => void
}

const DOT = { ok: 'bg-green-600', missing: 'bg-red-500', busy: 'bg-(--accent-primary)' } as const

function SetupRow({
  row,
  onInstall,
  onDownloadModels,
  onStop,
}: {
  row: VideoSetupRow
  onInstall: (tool: 'ffmpeg' | 'whisper') => void
  onDownloadModels: () => void
  onStop: (target: VideoSetupStopTarget) => void
}) {
  const { action, progress, stop } = row
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-(--text-primary)">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[row.state]}`} aria-hidden />
        <span>{row.label}</span>
        {row.status ? (
          <span className="text-xs font-normal text-(--text-muted)">{row.status}</span>
        ) : null}
        {stop ? (
          <span className="ml-auto flex shrink-0 items-baseline gap-2.5 text-xs font-normal text-(--text-secondary)">
            <InlineStopConfirm
              ask={stop.ask}
              stop={VIDEO_SETUP_TEXT.stop}
              keep={VIDEO_SETUP_TEXT.keep}
              label={stop.label}
              onStop={() => onStop(stop.target)}
            />
          </span>
        ) : null}
      </div>
      {row.note ? <p className="m-0 text-xs text-(--text-secondary)">{row.note}</p> : null}
      {action ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              action.kind === 'install' ? onInstall(action.tool) : onDownloadModels()
            }
          >
            {action.label}
          </Button>
          {action.kind === 'models' ? (
            <span className="text-xs text-(--text-secondary)">{action.note}</span>
          ) : null}
        </div>
      ) : null}
      {progress ? (
        <div className="flex flex-col gap-1">
          <div
            className="h-1 overflow-hidden rounded-full bg-(--surface-muted)"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={row.label}
          >
            <span
              className="block h-full bg-(--accent-primary) transition-[width] duration-150 ease-linear"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-(--text-secondary)">{progress.line}</span>
        </div>
      ) : null}
      {row.error ? <p className="m-0 text-xs text-(--status-stuck-soft-fg)">{row.error}</p> : null}
      {row.output ? (
        <TerminalOutput text={row.output} label={VIDEO_SETUP_TEXT.outputLabel} />
      ) : null}
    </div>
  )
}

/** Settings › Video as it stands, grouped by what each piece gives. */
export function VideoSettingsPanel({
  view,
  checking,
  loadError,
  agentError,
  agentStarting = false,
  onRecheck,
  onInstall,
  onDownloadModels,
  onStop,
  onAskAgent,
}: VideoSettingsPanelProps) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="m-0 text-xl font-semibold">{VIDEO_SETUP_TEXT.title}</h2>
        {view ? <ToneBadge tone={view.overall.tone}>{view.overall.label}</ToneBadge> : null}
        <span className="ml-auto">
          <Button variant="secondary" size="sm" onClick={onRecheck} disabled={checking}>
            {checking ? VIDEO_SETUP_TEXT.checking : VIDEO_SETUP_TEXT.recheck}
          </Button>
        </span>
      </div>
      <p className="m-0 text-xs text-(--text-secondary)">{VIDEO_SETUP_TEXT.lead}</p>
      {loadError ? <Alert>{loadError}</Alert> : null}
      {view?.canAskAgent ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-(--border-subtle) bg-(--surface-overlay) p-3">
          <SetUpWithAgentButton onClick={onAskAgent} disabled={agentStarting} />
          <span className="min-w-0 flex-1 basis-60 text-xs text-(--text-secondary)">
            {agentStarting ? VIDEO_SETUP_TEXT.agentStarting : VIDEO_SETUP_TEXT.agentNote}
          </span>
        </div>
      ) : null}
      {agentError ? <Alert>{agentError}</Alert> : null}
      {view?.groups.map((group) => (
        <section key={group.id} className="flex flex-col gap-3 pt-1">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h3 className="m-0 text-sm font-semibold">{group.title}</h3>
              <ToneBadge tone={group.tone}>{group.badge}</ToneBadge>
            </div>
            <p className="m-0 text-xs text-(--text-secondary)">{group.note}</p>
          </div>
          {group.rows.map((row) => (
            <SetupRow
              key={row.id}
              row={row}
              onInstall={onInstall}
              onDownloadModels={onDownloadModels}
              onStop={onStop}
            />
          ))}
        </section>
      ))}
      {view?.ready ? (
        <p className="m-0 text-xs text-(--text-secondary)">{VIDEO_SETUP_TEXT.offline}</p>
      ) : null}
    </div>
  )
}

export type VideoSettingsProps = {
  /** Takes the person to the chat the setup agent was started in. */
  onOpenChat: (context: ChatContext) => void
}

/** Settings › Video: every step runs on the machine that runs Overseer, from any client. */
export default function VideoSettings({ onOpenChat }: VideoSettingsProps) {
  const {
    view,
    checking,
    loadError,
    agentError,
    agentStarting,
    recheck,
    install,
    downloadModels,
    stop,
    askAgent,
  } = useVideoSetup()
  return (
    <VideoSettingsPanel
      view={view}
      checking={checking}
      {...(loadError ? { loadError } : {})}
      {...(agentError ? { agentError } : {})}
      agentStarting={agentStarting}
      onRecheck={recheck}
      onInstall={install}
      onDownloadModels={downloadModels}
      onStop={stop}
      onAskAgent={() => askAgent(onOpenChat)}
    />
  )
}
