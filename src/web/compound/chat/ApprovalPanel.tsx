import { useRef, useState, type ReactNode } from 'react'
import { useCanonicalizeReferences } from '../../../headless/contexts/ReferenceRenderingContext'

import { Button } from '../../primitives/Button'
import Surface from '../../primitives/Surface'
import { Textarea } from '../../primitives/Textarea'
import Tooltip from '../../primitives/Tooltip'
import { IconChevron } from '../../icons'
import {
  LAUNCH_NOTE_MAX_CHARS,
  grantDetailView,
  isStartFeatureWorkGrant,
  launchRunnerLabel,
  startFeatureWorkGrantSummary,
} from '../../../headless/utils/approvalGrant'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { alwaysAllowChoiceView, alwaysAllowDecision } from '../../../headless/utils/alwaysAllow'
import type { GrantDetailView } from '../../../headless/utils/approvalGrantTypes'
import type { PendingToolGrantDecision } from '../../../headless/utils/chatTypes'
import AlwaysAllowControl from './AlwaysAllowControl'
import { processProposalView } from '../../../headless/utils/processProposalView'
import {
  featureProcessChoice,
  featureProcessMetadata,
  featuresToWork,
  isGitSetupGrant,
  isGitChangeGrant,
  isRunProposalGrant,
  isStartGroupWorkGrant,
  LAUNCH_HOW_IT_RUNS_HEADING,
  launchFeatureRows,
  launchProofPlanRows,
  proofPlanMetadata,
  proposalFeatureProcessId,
  processGrantTurnLimitView,
  processOpenWorkMetadata,
  processTurnLimitOfView,
  setLaunchProofNotes,
  toggleLaunchProofKind,
  useProcessProposal,
  useProjectNotes,
  useStories,
} from '../../../headless'
import type {
  LaunchProofPlanEdits,
  PendingToolGrant,
  ProcessOpenWorkChoice,
} from '../../../headless'
import DependencyBullet from '../stories/DependencyBullet'
import FeatureProcessChooser from './FeatureProcessChooser'
import OpenWorkChooser from './OpenWorkChooser'
import LaunchFeatureList from './LaunchFeatureList'
import ProjectNoteChip from '../chips/ProjectNoteChip'
import GitSetupApprovalPanel from './GitSetupApprovalPanel'
import GroupWorkLaunchPanel from './GroupWorkLaunchPanel'
import GitChangeApprovalPanel from './GitChangeApprovalPanel'
import RunProposalApprovalPanel from './RunProposalApprovalPanel'
import RichText from '../files/RichText'
import { TurnLimitField } from '../TurnLimitField'

export type ApprovalPanelProps = {
  /** The lone pending permission grant this panel decides. */
  grant: PendingToolGrant
  /**
   * The chat's project. Used to resolve the launch PROPOSAL — the plan the user
   * reads before approving. The chat's own project, not any global "active"
   * one, because the story and its process both belong to this chat. Omitted ⇒
   * the dock falls back to the plain feature list.
   */
  projectId?: string
  /** The chat's group, for a launch across the group's projects. */
  groupId?: string
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
    /** The CLI chosen for THIS run, or `undefined` while it is the chat's. */
    cli: string | undefined
    onPickCli: (cli: string, credentialId: string | undefined, model: string | undefined) => void
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
 * stays visible and the decision is unmissable, while `onDecideLater` leaves a
 * tool ask parked and hands the composer back.
 *
 * A feature-work launch is not a tool permission — approving it spends an agent
 * run — so it renders as a dock that says what is about to happen: the story,
 * the features in the order they will be picked up, what happens after "yes",
 * and a note field that goes into the run's opening prompt. Every other gated
 * ask shows the tool and its arguments.
 *
 * The dock answers the agent either way and offers no park: "later" would end
 * exactly where "no" ends — back in the chat with the work not started — so a
 * third button only made the user rank two words for the same outcome. A tool
 * ask still parks, because there the agent is mid-turn and waiting.
 *
 * It deliberately takes NO external `busy` flag. The agent is by definition
 * mid-turn while it waits on this decision, so disabling the controls on "the
 * chat is sending" made the buttons permanently dead exactly when they were
 * needed. The only disable is the local one while THIS decision is in flight.
 */
export default function ApprovalPanel(props: ApprovalPanelProps) {
  // Putting a project on GitHub names an account, a repository and a
  // visibility the user must see and may change — it has its own card.
  if (isStartGroupWorkGrant(props.grant)) {
    return (
      <GroupWorkLaunchPanel
        grant={props.grant}
        {...(props.groupId !== undefined ? { groupId: props.groupId } : {})}
        {...(props.renderModelChip ? { renderModelChip: props.renderModelChip } : {})}
        onDecideLater={props.onDecideLater}
      />
    )
  }
  if (isGitChangeGrant(props.grant)) {
    return <GitChangeApprovalPanel grant={props.grant} onDecideLater={props.onDecideLater} />
  }
  if (isRunProposalGrant(props.grant)) {
    return <RunProposalApprovalPanel grant={props.grant} onDecideLater={props.onDecideLater} />
  }
  return isGitSetupGrant(props.grant) ? (
    <GitSetupApprovalPanel
      grant={props.grant}
      {...(props.projectId !== undefined ? { projectId: props.projectId } : {})}
      onDecideLater={props.onDecideLater}
    />
  ) : (
    <ToolApprovalPanel {...props} />
  )
}

function ToolApprovalPanel({
  grant,
  projectId,
  onDecideLater,
  renderModelChip,
}: ApprovalPanelProps) {
  const isLaunch = isStartFeatureWorkGrant(grant)
  const summary = startFeatureWorkGrantSummary(grant)
  const { headline, detail }: GrantDetailView = isLaunch ? {} : grantDetailView(grant.detail)
  const alwaysAllowScopes = !isLaunch ? (grant.alwaysAllowScopes ?? []) : []
  const { getStory } = useStories()
  // The notes this launch will point the run at — resolved to labels so you can
  // see exactly which stored notes (a login, a key) the run is sanctioned to read
  // before you approve. Only fetched for a launch that flagged some.
  const flaggedNoteIds = summary.relevantNoteIds ?? []
  const { notes: projectNotes, revealNote } = useProjectNotes(
    isLaunch && flaggedNoteIds.length > 0 ? projectId : undefined,
  )
  const flaggedNotes = flaggedNoteIds.map(
    (id) => projectNotes.find((n) => n.id === id) ?? { id, label: id, kind: 'note' as const },
  )
  const runnerLabel = launchRunnerLabel(summary, grant.chatRunner)
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [agentNoteOpen, setAgentNoteOpen] = useState(false)
  // The card can take the chat's whole height while it is read through.
  const [expanded, setExpanded] = useState(false)
  // The model this WORK runs on. Seeded from the chat by the chip itself and
  // sent with the decision — picking here must never change the agent the
  // conversation is being held with.
  const [runModel, setRunModel] = useState<string | undefined>(undefined)
  // The CLI this WORK runs on. Same rule as the model: seeded from the chat and
  // sent with the decision, never written back — picking an agent for one piece
  // of work must not move the conversation onto it.
  const [runCli, setRunCli] = useState<string | undefined>(undefined)
  const [runCliCredentialId, setRunCliCredentialId] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // How far each step's agent may go — the person's pick, else what the agent
  // asked for, else the default for the transport the work runs on.
  const launchRunner = runCli ? 'cli' : (summary.runner ?? grant.chatRunner)
  const turnLimitStart = processGrantTurnLimitView(summary.turnLimit, launchRunner)
  const [turnLimitPick, setTurnLimitPick] = useState<
    { limited: boolean; maxTurns: number } | undefined
  >(undefined)
  const turnLimit = turnLimitPick ?? turnLimitStart

  const story = isLaunch && summary.storyId ? getStory(summary.storyId) : undefined
  const features = story ? featuresToWork(story) : []
  // How each feature is worked — the person's pick, never the agent's. Until
  // they pick, the story process's own; the proposal nests whichever is picked.
  const [featureProcessPick, setFeatureProcessPick] = useState<string | undefined>(undefined)
  // The resolved plan the user reads before approving — the whole path the run
  // will take, per feature, not just the feature list. Fetched only for a launch
  // grant that names a story; a miss falls back to the plain feature list below.
  const {
    proposal,
    refusal,
    isLoaded: proposalLoaded,
  } = useProcessProposal({
    projectId,
    storyId: isLaunch ? summary.storyId : undefined,
    ...(summary.processId ? { processId: summary.processId } : {}),
    ...(featureProcessPick ? { featureProcessId: featureProcessPick } : {}),
  })
  const featureProcess = featureProcessChoice(proposal, featureProcessPick)
  // The story process's own way of working features, as first proposed — the
  // one marked default once the person picks another.
  const defaultFeatureProcessRef = useRef<string | undefined>(undefined)
  if (defaultFeatureProcessRef.current === undefined && featureProcessPick === undefined) {
    defaultFeatureProcessRef.current = proposalFeatureProcessId(proposal)
  }
  const defaultFeatureProcess = defaultFeatureProcessRef.current
  const proposalView = proposal ? processProposalView(proposal) : undefined
  // The story's open work — a run still going, or finished and not merged. The
  // launch waits for the person to choose how to proceed over it; the choice is
  // theirs, carried on the decision on either transport.
  const openWork = proposal?.openWork
  const [openWorkChoice, setOpenWorkChoice] = useState<ProcessOpenWorkChoice | undefined>(undefined)
  const openWorkMeta = openWork ? processOpenWorkMetadata(openWork, openWorkChoice) : undefined
  // Work added to an open run is worked the way that run works its own.
  const joinsOpenRun = openWorkChoice === 'extend' && openWorkMeta !== undefined
  const featureProcessMeta = joinsOpenRun ? undefined : featureProcessMetadata(featureProcess)
  // How each feature is proven — its requestor's plan, confirmed or added to
  // here. Work joining an open run reads the features' own plans, so it saves.
  const [proofPlanEdits, setProofPlanEdits] = useState<LaunchProofPlanEdits>({})
  const [saveProofPlans, setSaveProofPlans] = useState(false)
  const proofPlanRows = launchProofPlanRows(proposal, proofPlanEdits)
  const featureRows = launchFeatureRows(proposalView, proofPlanRows)
  const canonicalize = useCanonicalizeReferences()
  const proofPlanMeta = proofPlanMetadata(
    proposal,
    proofPlanEdits,
    joinsOpenRun || saveProofPlans,
    canonicalize,
  )
  // Until the preview has answered, whether the story has open work is unknown —
  // a launch then would be refused for want of a choice nobody was shown.
  const awaitingChoice =
    (summary.storyId !== undefined && !proposalLoaded) ||
    (openWork !== undefined && openWorkMeta === undefined)

  const decide = (decision: PendingToolGrantDecision) => {
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
              // Proof is no longer a dock toggle — it belongs to the process the
              // agent chose (its Verify → Report chain), so the launch carries
              // the agent's own choice unchanged rather than overriding it here.
              ...(trimmedNote ? { note: trimmedNote } : {}),
              ...(runModel ? { cliModel: runModel } : {}),
              ...(runCli ? { cliTool: runCli } : {}),
              ...(runCliCredentialId ? { cliCredentialId: runCliCredentialId } : {}),
              turnLimit: processTurnLimitOfView(turnLimit),
              ...(decision === 'once' && openWorkMeta ? openWorkMeta : {}),
              ...(decision === 'once' && featureProcessMeta ? featureProcessMeta : {}),
              ...(decision === 'once' && proofPlanMeta ? proofPlanMeta : {}),
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
        {headline !== undefined && (
          <div className="text-sm text-(--text-primary)">
            <RichText text={headline} />
          </div>
        )}
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
          {alwaysAllowScopes.length > 0 && (
            <AlwaysAllowControl
              variant="button"
              view={alwaysAllowChoiceView({
                scopes: alwaysAllowScopes,
                toolName: grant.label,
                covers: grant.grantCovers ?? 'exact-call',
              })}
              toolName={grant.label}
              onChoose={(scope) => {
                if (scope) decide(alwaysAllowDecision(scope))
              }}
              disabled={busy}
            />
          )}
          <Button variant="secondary" size="sm" onClick={() => decide('deny')} disabled={busy}>
            Not now
          </Button>
          <Button size="sm" onClick={() => decide('once')} loading={busy}>
            Approve
          </Button>
        </div>
      </Surface>
    )
  }

  return (
    // Bounded, with its own scroll: the card grows with the story, and a story of
    // a dozen features used to push the decision off the screen with no way to
    // reach it. The header and the decision stay put while the middle scrolls.
    <div
      className={`flex min-h-0 flex-col border-t border-(--border-default) bg-(--surface-raised) shadow-[0_-1px_0_var(--border-subtle)] ${
        expanded ? 'h-screen' : 'max-h-[min(62vh,600px)]'
      }`}
    >
      <div className="flex shrink-0 items-start gap-2 border-b border-(--border-subtle) px-3 pt-3 pb-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-(--text-primary)">
            <span className="badge badge--soft badge--review badge--sm">
              <span className="badge__dot badge__dot--hollow" />
              Needs you
            </span>
            Start work on this story?
          </div>
          {summary.storyId ? (
            <div className="flex min-w-0 items-baseline gap-2">
              <DependencyBullet dependency={summary.storyId} interactive />
              <span className="min-w-0 truncate text-[13px] text-(--text-secondary)">
                {story?.title ?? 'Story'}
              </span>
            </div>
          ) : null}
        </div>
        <Tooltip
          placement="top"
          content={<div className={TIP}>{expanded ? 'Back to the chat' : 'Expand'}</div>}
        >
          <button
            type="button"
            aria-label={expanded ? 'Back to the chat' : 'Expand'}
            aria-pressed={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-(--border-default) bg-(--surface-base) text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary)"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden
            >
              {expanded ? (
                <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" />
              ) : (
                <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
              )}
            </svg>
          </button>
        </Tooltip>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2.5">
        {openWork ? (
          <OpenWorkChooser
            openWork={openWork}
            choice={openWorkChoice}
            busy={busy}
            onChoose={setOpenWorkChoice}
          />
        ) : null}

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {LAUNCH_HOW_IT_RUNS_HEADING}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {proposalFeatureProcessId(proposal) !== undefined ? (
              <FeatureProcessChooser
                choice={featureProcess}
                {...(defaultFeatureProcess !== undefined
                  ? { defaultChoice: defaultFeatureProcess }
                  : {})}
                joinsOpenRun={joinsOpenRun}
                busy={busy}
                onChoose={setFeatureProcessPick}
              />
            ) : null}
            {renderModelChip ? (
              renderModelChip({
                model: runModel,
                onPick: setRunModel,
                cli: runCli,
                onPickCli: (cli, credentialId, model) => {
                  setRunCli(cli)
                  setRunCliCredentialId(credentialId)
                  // A different CLI has its own models, so the previously picked
                  // model no longer applies: fall back to that CLI's default.
                  setRunModel(model)
                },
              })
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
                  <b>Isolation</b>
                  <p className="mt-0.5">
                    The run gets its own copy of the repo and its own branch. Your files and the
                    branch you are on are never touched, even if it fails.
                  </p>
                </div>
              }
            >
              <span className="inline-flex h-[26px] items-center rounded-full border border-(--border-default) bg-(--surface-base) px-2.5 text-[12px] text-(--text-secondary)">
                Isolated copy
              </span>
            </Tooltip>
            <span className="text-[11.5px] text-(--text-muted)">Merges nothing.</span>
          </div>
          <TurnLimitField
            {...turnLimitStart}
            limited={turnLimit.limited}
            maxTurns={turnLimit.maxTurns}
            disabled={busy}
            onChange={setTurnLimitPick}
          />
        </div>

        {featureRows.length > 0 ? (
          <LaunchFeatureList
            {...(summary.storyId ? { storyId: summary.storyId } : {})}
            rows={featureRows}
            tail={proposalView?.tail ?? []}
            {...(proposalView ? { agentStepCount: proposalView.agentStepCount } : {})}
            save={saveProofPlans}
            joinsOpenRun={joinsOpenRun}
            busy={busy}
            onToggleKind={(featureId, kind) =>
              setProofPlanEdits((prev) => toggleLaunchProofKind(proposal, prev, featureId, kind))
            }
            onNotesChange={(featureId, notes) =>
              setProofPlanEdits((prev) => setLaunchProofNotes(proposal, prev, featureId, notes))
            }
            onSaveChange={setSaveProofPlans}
          />
        ) : (
          <div className="flex flex-col gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
              Features to work on
            </span>
            {refusal !== undefined ? (
              <span className="text-[12px] text-(--text-secondary)">{refusal}</span>
            ) : features.length === 0 ? (
              <span className="text-[12px] text-(--text-secondary)">
                {story
                  ? 'Every feature on this story is done or deferred — it will be refused when launched.'
                  : 'Loading the story…'}
              </span>
            ) : (
              features.map((feature) => (
                <div key={feature.id} className="flex items-center gap-2 text-[12.5px]">
                  {summary.storyId ? (
                    <DependencyBullet dependency={`${summary.storyId}.${feature.id}`} interactive />
                  ) : null}
                  <span className="min-w-0 truncate text-(--text-primary)">{feature.title}</span>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {flaggedNotes.length > 0 ? (
            // Which stored notes this launch will let the run read — a login for the
            // screen under test, an API key. Read-only here (the agent proposed
            // them); approving the launch sanctions the run to read them, even ones
            // set to "ask". Values are never shown — only labels.
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11.5px] text-(--text-secondary)">
                Notes this run will use:
              </span>
              {flaggedNotes.map((n) => (
                <ProjectNoteChip key={n.id} note={n} loadValue={() => revealNote(n.id)} />
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {summary.note ? (
              // The agent's own note: context from the conversation, worth being
              // able to read before approving, not worth a standing block.
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
            ) : null}
            {!noteOpen ? (
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
            ) : null}
          </div>
          {summary.note && agentNoteOpen ? (
            <p className="rounded border border-(--border-subtle) bg-(--surface-base) px-2 py-1.5 text-[11.5px] leading-relaxed text-(--text-secondary)">
              {summary.note}
            </p>
          ) : null}
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
          ) : null}
        </div>
      </div>

      {error !== null && (
        <div className="mx-3 mb-2 shrink-0 rounded-md border border-(--color-red-500) bg-(--color-red-50) dark:bg-(--color-red-900)/20 px-3 py-2 text-sm text-(--color-red-700) dark:text-(--color-red-300)">
          {error}
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-(--border-subtle) px-3 py-2.5">
        <span className="text-[11.5px] text-(--text-muted)">
          Nothing goes in without your sign-off.
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDecideLater} disabled={busy}>
            Decide later
          </Button>
          <Tooltip
            placement="top"
            content={
              <div className={TIP}>
                <b>Answers the agent: no</b>
                <p className="mt-0.5">
                  The run is not started and the story is left exactly as it is. The agent is told
                  you said no, so it can suggest something else or wait.
                </p>
                <p className="mt-1 text-(--text-muted)">
                  Nothing is cancelled or deleted, and you can ask again at any time.
                </p>
              </div>
            }
          >
            <Button variant="danger" size="sm" onClick={() => decide('deny')} disabled={busy}>
              No — cancel
            </Button>
          </Tooltip>
          <Tooltip
            placement="top"
            content={
              <div className={TIP}>
                <b>Launches the run now</b>
                <p className="mt-0.5">
                  {features.length} feature{features.length === 1 ? ' is' : 's are'} picked up, an
                  isolated copy is made and the agent begins. You can watch it, and you can cancel
                  it at any point.
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
              // `features` is legitimately empty while the story loads.
              disabled={
                refusal !== undefined ||
                awaitingChoice ||
                (story !== undefined && features.length === 0)
              }
            >
              {openWorkChoice === 'extend' && openWorkMeta ? 'Add to that run' : 'Start work'}
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
