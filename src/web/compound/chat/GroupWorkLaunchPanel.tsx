import { useState, type ReactNode } from 'react'

import {
  LAUNCH_NOTE_MAX_CHARS,
  LAUNCH_OPTIONS_READ_ONLY,
  PROCESS_GROUP_EARLY_MERGE_LABEL,
  PROCESS_GROUP_LAUNCH_BLURB,
  PROCESS_GROUP_MODE_LABELS,
  PROCESS_GROUP_PREREQUISITE_MODES,
  defaultProcessGroupLegModes,
  launchOptionsAreHonoured,
  processGroupLaunchMetadata,
  processGroupLegWaitsFor,
  startGroupWorkGrantSummary,
  useProcessGroupLaunchPreview,
  type PendingToolGrant,
  type ProcessGroupLegModes,
  type ProcessIntegrationMode,
} from '../../../headless'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { Button } from '../../primitives/Button'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Textarea } from '../../primitives/Textarea'
import { IconChevron } from '../../icons'

export type GroupWorkLaunchPanelProps = {
  /** The pending `startGroupWork` ask. */
  grant: PendingToolGrant
  /** The group the chat belongs to. */
  groupId?: string
  /** The app's model chip for this chat — the agent every project's work runs on. */
  renderModelChip?: (picked: {
    model: string | undefined
    onPick: (modelId: string) => void
    cli: string | undefined
    onPickCli: (cli: string, credentialId: string | undefined, model: string | undefined) => void
  }) => ReactNode
  onDecideLater: () => void
}

/**
 * The launch of one run across several projects, read before it starts: each
 * project with its story and what it waits for, in the order they run, every
 * reason it cannot start, and how each project others build on is merged when
 * its turn comes (merge or squash — you still approve each of those merges).
 */
export default function GroupWorkLaunchPanel({
  grant,
  groupId,
  renderModelChip,
  onDecideLater,
}: GroupWorkLaunchPanelProps) {
  const summary = startGroupWorkGrantSummary(grant)
  const launchGroupId = groupId ?? summary.groupId
  const { preview, isLoaded, loadError } = useProcessGroupLaunchPreview({
    groupId: launchGroupId,
    legs: summary.legs,
  })
  const optionsHonoured = launchOptionsAreHonoured(grant)
  const [modes, setModes] = useState<ProcessGroupLegModes>({})
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [agentNoteOpen, setAgentNoteOpen] = useState(false)
  const [runModel, setRunModel] = useState<string | undefined>(undefined)
  const [runCli, setRunCli] = useState<string | undefined>(undefined)
  const [runCliCredentialId, setRunCliCredentialId] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chosenModes = { ...defaultProcessGroupLegModes(preview), ...modes }
  const problems = preview?.problems ?? []
  const canStart = isLoaded && preview !== undefined && problems.length === 0

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    const trimmed = note.trim()
    void grant
      .decide(
        decision,
        decision === 'once'
          ? {
              ...(trimmed ? { note: trimmed } : {}),
              ...(runModel ? { cliModel: runModel } : {}),
              ...(runCli ? { cliTool: runCli } : {}),
              ...(runCliCredentialId ? { cliCredentialId: runCliCredentialId } : {}),
              ...processGroupLaunchMetadata(chosenModes),
            }
          : undefined,
      )
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  const legsByWave = (preview?.waves ?? []).map((wave) =>
    wave.flatMap((id) => preview?.legs.filter((l) => l.projectId === id) ?? []),
  )

  return (
    <div className="flex flex-col gap-2.5 border-t border-(--border-default) bg-(--surface-raised) px-3 py-3 shadow-[0_-1px_0_var(--border-subtle)]">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-(--text-primary)">
        <span className="badge badge--soft badge--review badge--sm">
          <span className="badge__dot badge__dot--hollow" />
          Needs you
        </span>
        Start work across {summary.legs.length} project{summary.legs.length === 1 ? '' : 's'}?
      </div>
      {summary.title ? (
        <div className="text-[13.5px] font-medium text-(--text-primary)">{summary.title}</div>
      ) : null}
      <p className="text-[11.5px] leading-relaxed text-(--text-secondary)">
        {PROCESS_GROUP_LAUNCH_BLURB}
      </p>

      <div className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2">
        {!isLoaded ? (
          <span className="text-[12px] text-(--text-secondary)">Reading the projects…</span>
        ) : loadError || !preview ? (
          <span className="text-[12px] text-(--text-secondary)">
            {launchGroupId
              ? 'The launch could not be previewed.'
              : 'The ask names no group to start the work in.'}
          </span>
        ) : (
          legsByWave.map((wave, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                {i === 0 ? 'Starts at once' : `Then — step ${i + 1}`}
              </span>
              {wave.map((leg) => (
                <div key={leg.projectId} className="flex flex-col gap-1 pl-1">
                  <div className="flex flex-wrap items-baseline gap-2 text-[12.5px]">
                    <span className="font-medium text-(--text-primary)">{leg.projectTitle}</span>
                    <span className="min-w-0 truncate text-(--text-secondary)">
                      {leg.storyTitle ?? leg.storyId}
                    </span>
                    <span className="text-[10.5px] text-(--text-muted)">
                      {leg.features} feature{leg.features === 1 ? '' : 's'}
                    </span>
                  </div>
                  {leg.isPrerequisite ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-(--text-secondary)">
                        {PROCESS_GROUP_EARLY_MERGE_LABEL}
                      </span>
                      <SegmentedControl
                        size="sm"
                        ariaLabel={`How ${leg.projectTitle} is merged early`}
                        value={chosenModes[leg.projectId] ?? 'merge'}
                        onChange={(v) =>
                          setModes((prev) => ({
                            ...prev,
                            [leg.projectId]: v as ProcessIntegrationMode,
                          }))
                        }
                        options={PROCESS_GROUP_PREREQUISITE_MODES.map((m) => ({
                          value: m,
                          label: PROCESS_GROUP_MODE_LABELS[m],
                        }))}
                      />
                    </div>
                  ) : null}
                  {processGroupLegWaitsFor(preview, leg.dependsOn) ? (
                    <span className="text-[11px] text-(--text-muted)">
                      {processGroupLegWaitsFor(preview, leg.dependsOn)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {problems.length > 0 ? (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-md px-2.5 py-2 text-[12px]"
          style={{
            background: 'var(--status-stuck-soft-bg)',
            border: '1px solid var(--status-stuck-soft-border)',
            color: 'var(--status-stuck-soft-fg)',
          }}
        >
          {problems.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      ) : null}

      {summary.note ? (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            aria-expanded={agentNoteOpen}
            onClick={() => setAgentNoteOpen((v) => !v)}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-(--border-default) bg-(--surface-base) px-2.5 py-1 text-[11.5px] text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary)"
          >
            <IconChevron
              className={`w-3 h-3 transition-transform ${agentNoteOpen ? 'rotate-90' : ''}`}
            />
            Note from the agent
          </button>
          {agentNoteOpen ? (
            <p className="rounded border border-(--border-subtle) bg-(--surface-base) px-2 py-1.5 text-[11.5px] leading-relaxed text-(--text-secondary)">
              {summary.note}
            </p>
          ) : null}
        </div>
      ) : null}

      {optionsHonoured ? (
        <>
          {renderModelChip ? (
            <div className="flex flex-wrap items-center gap-2">
              {renderModelChip({
                model: runModel,
                onPick: setRunModel,
                cli: runCli,
                onPickCli: (cli, credentialId, model) => {
                  setRunCli(cli)
                  setRunCliCredentialId(credentialId)
                  setRunModel(model)
                },
              })}
            </div>
          ) : null}
          {noteOpen ? (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                Note for every project{' '}
                <span className="font-normal normal-case tracking-normal">
                  — goes into each agent’s opening prompt
                </span>
              </span>
              <Textarea
                rows={2}
                value={note}
                disabled={busy}
                maxLength={LAUNCH_NOTE_MAX_CHARS}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything every project’s agent should know…"
              />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              disabled={busy}
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-(--border-strong) px-2.5 py-1 text-[11.5px] text-(--text-muted) hover:border-(--accent-primary) hover:text-(--text-primary)"
            >
              <span aria-hidden className="text-[13px] leading-none">
                +
              </span>
              Add a note for every project
            </button>
          )}
        </>
      ) : (
        <p className="text-[11.5px] text-(--text-muted)">{LAUNCH_OPTIONS_READ_ONLY}</p>
      )}

      {error !== null ? (
        <div className="rounded-md border border-(--color-red-500) bg-(--color-red-50) dark:bg-(--color-red-900)/20 px-3 py-2 text-sm text-(--color-red-700) dark:text-(--color-red-300)">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          loading={busy}
          disabled={!canStart}
          onClick={() => decide('once')}
        >
          Start work
        </Button>
        <Button size="sm" variant="danger" disabled={busy} onClick={() => decide('deny')}>
          No — cancel
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onDecideLater}>
          Decide later
        </Button>
      </div>
    </div>
  )
}
