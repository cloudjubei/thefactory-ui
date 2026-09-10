import { useState, type ReactNode } from 'react'

import { Button } from '../../primitives/Button'
import Surface from '../../primitives/Surface'
import { Textarea } from '../../primitives/Textarea'
import Tooltip from '../../primitives/Tooltip'
import { IconChevron } from '../../icons'
import {
  LAUNCH_NOTE_MAX_CHARS,
  LAUNCH_OPTIONS_READ_ONLY,
  featuresToWorkOn,
  formatGrantDetail,
  isStartFeatureWorkGrant,
  launchBeats,
  launchOptionsAreHonoured,
  launchRunnerLabel,
  startFeatureWorkGrantSummary,
} from '../../../headless/utils/approvalGrant'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { useStories } from '../../../headless'
import type { PendingToolGrant } from '../../../headless'
import DependencyBullet from '../stories/DependencyBullet'

export type ApprovalPanelProps = {
  /** The lone pending permission grant this panel decides. */
  grant: PendingToolGrant
  /**
   * The app's own model chip, wired to THIS chat. Rendered in place of the
   * static executor label so the model can be picked before the run starts —
   * the launch reads the chat's runner at approval time, so what the chip shows
   * is what the work runs on. Hosts that have no connected chip omit it and get
   * the label instead.
   */
  renderModelChip?: (picked: {
    /** The model chosen for THIS run, or `undefined` while it is the chat's. */
    model: string | undefined
    onPick: (modelId: string) => void
  }) => ReactNode
  /**
   * Restore the composer WITHOUT deciding — the ask stays pending, so the user
   * can type first (a clarification, a change of plan) and decide later from
   * here. This is what keeps "replace the composer" from trapping the user into
   * approve-or-deny.
   */
  onDecideLater: () => void
}

const TIP = 'max-w-[300px] text-xs text-(--text-primary)'

/**
 * The inline approval surface for the one ask a chat is blocked on. It takes the
 * composer's place (rather than a modal over the whole chat) so the conversation
 * stays visible and the decision is unmissable, while `onDecideLater` leaves an
 * escape back to typing.
 *
 * A feature-work launch is not a tool permission — approving it spends an agent
 * run — so it renders as a dock that says what is about to happen: the story,
 * the features in the order they will be picked up, what happens after "yes",
 * and a note field that goes into the run's opening prompt. Every other gated
 * ask shows the tool and its arguments.
 *
 * It deliberately takes NO external `busy` flag. The agent is by definition
 * mid-turn while it waits on this decision, so disabling the controls on "the
 * chat is sending" made the buttons permanently dead exactly when they were
 * needed. The only disable is the local one while THIS decision is in flight.
 */
export default function ApprovalPanel({
  grant,
  onDecideLater,
  renderModelChip,
}: ApprovalPanelProps) {
  const isLaunch = isStartFeatureWorkGrant(grant)
  const summary = startFeatureWorkGrantSummary(grant)
  const detail = isLaunch ? undefined : formatGrantDetail(grant.detail)
  const canGrantPermanently =
    !isLaunch && grant.source === 'cli' && grant.canGrantPermanently !== false
  const { getStory } = useStories()
  // Only a CLI decision carries metadata to the launch; on the API transport the
  // agent's own arguments are what runs, so the options are shown, not offered.
  const optionsHonoured = launchOptionsAreHonoured(grant)
  const runnerLabel = launchRunnerLabel(summary, grant.source)
  const [captureProof, setCaptureProof] = useState(summary.proofRequired)
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [agentNoteOpen, setAgentNoteOpen] = useState(false)
  // The model this WORK runs on. Seeded from the chat by the chip itself and
  // sent with the decision — picking here must never change the agent the
  // conversation is being held with.
  const [runModel, setRunModel] = useState<string | undefined>(undefined)
  const [beatsOpen, setBeatsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const story = isLaunch && summary.storyId ? getStory(summary.storyId) : undefined
  const features = story ? featuresToWorkOn(story) : []
  const beats = launchBeats(captureProof)

  const decide = (decision: 'once' | 'deny' | 'permanent') => {
    setBusy(true)
    setError(null)
    const trimmedNote = note.trim()
    // A refused decision (409: the approval already expired / was decided)
    // must be SHOWN — a swallowed failure here looked like "approved, then
    // nothing happened".
    void grant
      .decide(
        decision,
        isLaunch
          ? {
              proofRequired: captureProof,
              ...(trimmedNote ? { note: trimmedNote } : {}),
              ...(runModel ? { cliModel: runModel } : {}),
            }
          : undefined,
      )
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  if (!isLaunch) {
    return (
      <Surface className="m-3 p-4 flex flex-col gap-3 border border-(--border-strong)">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold">The agent needs your approval</div>
          <p className="text-xs opacity-80">
            It is waiting on this before it can continue: <code>{grant.label}</code>
          </p>
        </div>
        {detail !== undefined && (
          <pre className="rounded-md bg-(--surface-muted) p-3 font-mono text-xs whitespace-pre-wrap wrap-break-word max-h-40 overflow-auto opacity-90">
            {detail}
          </pre>
        )}
        {error !== null && (
          <div className="rounded-md border border-(--color-red-500) bg-(--color-red-50) dark:bg-(--color-red-900)/20 px-3 py-2 text-sm text-(--color-red-700) dark:text-(--color-red-300)">
            {error}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={onDecideLater} disabled={busy}>
            Decide later
          </Button>
          {canGrantPermanently && (
            <Button variant="ghost" size="sm" onClick={() => decide('permanent')} disabled={busy}>
              Always allow
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => decide('deny')} disabled={busy}>
            Don’t start it
          </Button>
          <Button size="sm" onClick={() => decide('once')} loading={busy}>
            Approve
          </Button>
        </div>
      </Surface>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 border-t border-(--border-default) bg-(--surface-raised) px-3 py-3 shadow-[0_-1px_0_var(--border-subtle)]">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-(--text-primary)">
        <span className="badge badge--soft badge--review badge--sm">
          <span className="badge__dot badge__dot--hollow" />
          Needs you
        </span>
        Start work on this story?
      </div>

      {summary.storyId ? (
        <div className="flex flex-wrap items-baseline gap-2">
          <DependencyBullet dependency={summary.storyId} interactive />
          <span className="text-[13.5px] font-medium text-(--text-primary)">
            {story?.title ?? 'Story'}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
          Features to work on
        </span>
        {features.length === 0 ? (
          <span className="text-[12px] text-(--text-secondary)">
            {story
              ? 'No feature on this story is ready — it will be refused when launched.'
              : 'Loading the story…'}
          </span>
        ) : (
          features.map((feature, i) => (
            <div key={feature.id} className="flex items-center gap-2 text-[12.5px]">
              <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-(--text-muted)">
                {i + 1}
              </span>
              {summary.storyId ? (
                <DependencyBullet dependency={`${summary.storyId}.${feature.id}`} interactive />
              ) : null}
              <span className="min-w-0 truncate text-(--text-primary)">{feature.title}</span>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {renderModelChip ? (
          renderModelChip({ model: runModel, onPick: setRunModel })
        ) : (
          <Tooltip
            placement="top"
            content={
              <div className={TIP}>
                <b>Agent</b>
                <p className="mt-0.5">{runnerLabel.tip}</p>
              </div>
            }
          >
            <span
              className={`inline-flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-[12px] ${
                runnerLabel.redirected
                  ? 'border-(--status-working-soft-border) bg-(--status-working-soft-bg) text-(--status-working-soft-fg)'
                  : 'border-(--border-default) bg-(--surface-base) text-(--text-secondary)'
              }`}
            >
              {runnerLabel.label}
              <span className="rounded-full border border-(--border-subtle) bg-(--surface-overlay) px-1.5 py-[1px] text-[9px] font-semibold tracking-wide">
                {runnerLabel.pill}
              </span>
            </span>
          </Tooltip>
        )}

        <Tooltip
          placement="top"
          content={
            <div className={TIP}>
              <b>A switch, not a label</b>
              <p className="mt-0.5">
                On, the run may not report done until it has filed evidence — a build, a device
                screenshot, a test result. Off, it can claim done on its own word.
              </p>
            </div>
          }
        >
          <button
            type="button"
            aria-pressed={captureProof}
            disabled={busy || !optionsHonoured}
            onClick={() => setCaptureProof((v) => !v)}
            className={`inline-flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-[12px] transition-colors ${
              captureProof
                ? 'border-(--accent-primary)/45 bg-(--accent-primary)/10 text-(--text-primary)'
                : 'border-(--status-working-soft-border) bg-(--status-working-soft-bg) text-(--status-working-soft-fg)'
            }`}
          >
            <span
              className={`grid h-[13px] w-[13px] place-items-center rounded-[3.5px] border-[1.5px] text-[9px] leading-none ${
                captureProof
                  ? 'border-(--accent-primary) bg-(--accent-primary) text-(--text-inverted)'
                  : 'border-current'
              }`}
              aria-hidden
            >
              {captureProof ? '✓' : ''}
            </span>
            {captureProof ? 'Proof required' : 'No proof required'}
          </button>
        </Tooltip>

        <Tooltip
          placement="top"
          content={
            <div className={TIP}>
              <b>Isolation</b>
              <p className="mt-0.5">
                The run gets its own copy of the repo and its own branch. Your files and the branch
                you are on are never touched, even if it fails.
              </p>
            </div>
          }
        >
          <span className="inline-flex h-[26px] items-center rounded-full border border-(--border-default) bg-(--surface-base) px-2.5 text-[12px] text-(--text-secondary)">
            Isolated copy
          </span>
        </Tooltip>
      </div>

      {/* Ordinal markers live in exactly one state: the closed chain carries none,
          the open well carries them all — so there is nothing to stutter against. */}
      <div>
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left"
          aria-expanded={beatsOpen}
          onClick={() => setBeatsOpen((v) => !v)}
        >
          <IconChevron
            className="w-3.5 h-3.5 shrink-0 text-(--text-muted) transition-transform"
            style={{ transform: beatsOpen ? 'rotate(90deg)' : undefined }}
          />
          <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-(--text-secondary)">
            {beats.map((beat, i) => {
              const last = i === beats.length - 1
              const word =
                i === 0 ? beat.title : beat.title.charAt(0).toLowerCase() + beat.title.slice(1)
              return (
                <span key={beat.title} className="inline-flex items-center gap-1.5">
                  {i > 0 ? <span className="text-(--border-strong)">→</span> : null}
                  <span
                    className={
                      beat.off
                        ? 'font-semibold text-(--status-working-soft-fg)'
                        : i === 0 || last
                          ? 'font-semibold text-(--text-primary)'
                          : ''
                    }
                  >
                    {word}
                  </span>
                </span>
              )
            })}
          </span>
        </button>
        {beatsOpen ? (
          <ol className="ml-[22px] mt-2 flex list-none flex-col gap-1.5 rounded-r-md border-l-2 border-(--border-default) bg-(--surface-base) p-2.5 pl-3">
            {beats.map((beat, i) => (
              <li
                key={beat.title}
                className="grid grid-cols-[14px_minmax(0,1fr)] gap-2 text-[12px] text-(--text-secondary)"
              >
                <span className="text-[10px] font-semibold tabular-nums leading-[1.45] text-(--text-muted)">
                  {i + 1}
                </span>
                <span>
                  <b
                    className={`font-semibold ${
                      beat.off ? 'text-(--status-working-soft-fg)' : 'text-(--text-primary)'
                    }`}
                  >
                    {beat.title}
                  </b>{' '}
                  — {beat.detail}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {summary.note ? (
        // The agent's own note, when it wrote one. Collapsed to a chip: it is
        // context from the conversation, worth being able to read before
        // approving, but not worth a standing block above every launch. Sits
        // ABOVE the user's own note — the agent briefed the run first.
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
        <div className="flex flex-col gap-1.5">
          {noteOpen ? (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                Note for this run{' '}
                <span className="font-normal normal-case tracking-normal">
                  — goes into its opening prompt
                </span>
              </span>
              <Textarea
                rows={2}
                value={note}
                disabled={busy}
                maxLength={LAUNCH_NOTE_MAX_CHARS}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything this run should know — a flavour to use, a gotcha, an account to test with…"
              />
            </label>
          ) : (
            // Collapsed by default: most launches need no note, and an empty box
            // asks every user to decide about something almost none of them want.
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              disabled={busy}
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-(--border-strong) px-2.5 py-1 text-[11.5px] text-(--text-muted) hover:border-(--accent-primary) hover:text-(--text-primary)"
            >
              <span aria-hidden className="text-[13px] leading-none">
                +
              </span>
              Add a note for this run
            </button>
          )}
        </div>
      ) : (
        <p className="text-[11.5px] text-(--text-muted)">{LAUNCH_OPTIONS_READ_ONLY}</p>
      )}

      {error !== null && (
        <div className="rounded-md border border-(--color-red-500) bg-(--color-red-50) dark:bg-(--color-red-900)/20 px-3 py-2 text-sm text-(--color-red-700) dark:text-(--color-red-300)">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Tooltip
          placement="top"
          content={
            <div className={TIP}>
              <b>Launches the run now</b>
              <p className="mt-0.5">
                {features.length} feature{features.length === 1 ? ' is' : 's are'} picked up, an
                isolated copy is made and the agent begins. You can watch it, and you can cancel it
                at any point.
              </p>
              <p className="mt-1 text-(--text-muted)">
                Merges nothing. Your branch is not touched.
              </p>
            </div>
          }
        >
          <Button
            size="sm"
            variant="primary"
            onClick={() => decide('once')}
            loading={busy}
            // Only refuse when the story is KNOWN to have nothing pickable.
            // While it is still loading `features` is legitimately empty, and
            // greying the primary action there reads as "not allowed" rather
            // than "not loaded yet".
            disabled={story !== undefined && features.length === 0}
          >
            Start work
          </Button>
        </Tooltip>
        <Tooltip
          placement="top"
          content={
            <div className={TIP}>
              <b>Answers the agent: no</b>
              <p className="mt-0.5">
                The run is not started and the story is left exactly as it is. The agent is told you
                said no, so it can suggest something else or wait.
              </p>
              <p className="mt-1 text-(--text-muted)">
                Nothing is cancelled or deleted, and you can ask again at any time.
              </p>
            </div>
          }
        >
          <Button variant="ghost" size="sm" onClick={() => decide('deny')} disabled={busy}>
            Not now
          </Button>
        </Tooltip>
        <span className="flex-1" />
        <Tooltip
          placement="top"
          content={
            <div className={TIP}>
              <b>Answers nothing — the ask stays open</b>
              <p className="mt-0.5">
                Brings the composer back so you can type first — a question, a change of plan — and
                come back to this same ask afterwards.
              </p>
              <p className="mt-1 text-(--text-muted)">
                The agent is still waiting; it is not told anything either way.
              </p>
            </div>
          }
        >
          <Button variant="ghost" size="sm" onClick={onDecideLater} disabled={busy}>
            Decide later
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
