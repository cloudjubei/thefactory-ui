import { useRef, useState, type ReactNode } from 'react'
import { useLaunchAgentPick } from '../../../headless/hooks/useLaunchAgentPick'
import {
  launchAgentPickMetadata,
  launchAgentPickRunner,
} from '../../../headless/utils/launchAgentPick'
import type { LaunchModelChipSlot } from '../../../headless/utils/launchAgentPickTypes'
import { useCanonicalizeReferences } from '../../../headless/contexts/ReferenceRenderingContext'
import { Pressable, Text, View, useWindowDimensions } from 'react-native'

import { Textarea } from '../../primitives/Textarea'
import Tooltip from '../../primitives/Tooltip'
import {
  LAUNCH_NOTE_MAX_CHARS,
  isStartFeatureWorkGrant,
  launchRunnerLabel,
  startFeatureWorkGrantSummary,
} from '../../../headless/utils/approvalGrant'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import type { PendingToolGrantDecision } from '../../../headless/utils/chatTypes'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import ToolAskApprovalPanel from './ToolAskApprovalPanel'
import ToolAskCard from './ToolAskCard'
import {
  featureWorkAskView,
  featureWorkLaunchCheck,
  toolAskDecidedLine,
} from '../../../headless/utils/toolAskCard'
import { FEATURE_WORK_ASK } from '../../../headless/utils/toolAskCardConstants'
import { runProposalArgs } from '../../../headless/utils/runProposalView'
import { processProposalView } from '../../../headless/utils/processProposalView'
import { dependencyChipOf } from '../../../headless/utils/storyDependency'
import {
  baseBranchChoice,
  baseBranchMetadata,
  featureProcessChoice,
  featureProcessMetadata,
  storyOpenFeatures,
  isGitSetupGrant,
  isGitChangeGrant,
  isRunProposalGrant,
  isStartGroupWorkGrant,
  LAUNCH_HOW_IT_RUNS_HEADING,
  launchFeatureRows,
  launchProofPlanRows,
  processOpenWorkMetadata,
  proofPlanMetadata,
  proposalFeatureProcessId,
  processGrantTurnLimitView,
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
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import DependencyBullet, { type ResolvedDependency } from '../stories/DependencyBullet'
import BaseBranchChooser from './BaseBranchChooser'
import FeatureProcessChooser from './FeatureProcessChooser'
import OpenWorkChooser from './OpenWorkChooser'
import LaunchFeatureList from './LaunchFeatureList'
import ProjectNoteChip from '../chips/ProjectNoteChip'
import GitChangeApprovalPanel from './GitChangeApprovalPanel'
import RunProposalApprovalPanel from './RunProposalApprovalPanel'
import GitSetupApprovalPanel from './GitSetupApprovalPanel'
import GroupWorkLaunchPanel from './GroupWorkLaunchPanel'
import { TurnLimitField } from '../TurnLimitField'

export type ApprovalPanelProps = {
  grant: PendingToolGrant
  /**
   * The chat's project — used to resolve the launch PROPOSAL shown before
   * approval. The chat's own project, not a global active one. Omitted ⇒ the
   * dock falls back to the plain feature list.
   */
  projectId?: string
  /** The chat's group, for a launch across the group's projects. */
  groupId?: string
  /**
   * The app's own model chip, wired to THIS chat. Rendered in place of the
   * static executor label so the model can be picked before the run starts;
   * hosts with no connected chip omit it and get the label instead.
   */
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  onDecideLater: () => void
  /** The ask was decided on its card — what the card folds to. */
  onDecided?: (line: ToolAskDecidedLine) => void
}

/**
 * Native peer of [web's `ApprovalPanel`](../../../web/compound/chat/ApprovalPanel.tsx).
 * Takes the composer's place so the ask is unmissable while the chat stays
 * visible; `onDecideLater` leaves the ask waiting and hands the composer back.
 * Every ask reads as the one shared tool-ask card: a launch shows the story,
 * how it runs, the features in pick-up order and a note for the run; everything
 * else shows the thing it acts on. See the web peer for why this takes no
 * external busy flag.
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
        {...(props.onDecided ? { onDecided: props.onDecided } : {})}
      />
    )
  }
  if (isGitChangeGrant(props.grant)) {
    return (
      <GitChangeApprovalPanel
        grant={props.grant}
        onDecideLater={props.onDecideLater}
        {...(props.onDecided ? { onDecided: props.onDecided } : {})}
      />
    )
  }
  if (isRunProposalGrant(props.grant)) {
    return (
      <RunProposalApprovalPanel
        grant={props.grant}
        onDecideLater={props.onDecideLater}
        {...(props.onDecided ? { onDecided: props.onDecided } : {})}
      />
    )
  }
  if (isGitSetupGrant(props.grant)) {
    return (
      <GitSetupApprovalPanel
        grant={props.grant}
        {...(props.projectId !== undefined ? { projectId: props.projectId } : {})}
        onDecideLater={props.onDecideLater}
        {...(props.onDecided ? { onDecided: props.onDecided } : {})}
      />
    )
  }
  return isStartFeatureWorkGrant(props.grant) ? (
    <ToolApprovalPanel {...props} />
  ) : (
    <ToolAskApprovalPanel
      grant={props.grant}
      onDecideLater={props.onDecideLater}
      {...(props.onDecided ? { onDecided: props.onDecided } : {})}
    />
  )
}

function ToolApprovalPanel({
  grant,
  projectId,
  onDecideLater,
  onDecided,
  renderModelChip,
}: ApprovalPanelProps) {
  const { theme, status } = useNativeTheme()
  const isLaunch = isStartFeatureWorkGrant(grant)
  const summary = startFeatureWorkGrantSummary(grant)
  const { getStory, resolveDependency } = useStories()
  // The notes this launch will point the run at — resolved to labels so the user
  // sees which stored notes (a login, a key) the run may read before approving.
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
  // The card can take most of the screen while it is read through.
  const [expanded, setExpanded] = useState(false)
  const windowHeight = useWindowDimensions().height
  // The agent this WORK runs on — the API or a CLI, a model — seeded from the
  // chat by the chip and sent with the decision, never written back to the
  // conversation.
  const { pick: agentPick, slot: chipSlot } = useLaunchAgentPick()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // How far each step's agent may go — the person's pick, else what the agent
  // asked for, else the default for the transport the work runs on.
  const turnLimitStart = processGrantTurnLimitView(
    summary.turnLimit,
    launchAgentPickRunner(agentPick, summary.runner ?? grant.chatRunner),
  )
  const [turnLimitPick, setTurnLimitPick] = useState<
    { limited: boolean; maxTurns: number } | undefined
  >(undefined)
  const turnLimit = turnLimitPick ?? turnLimitStart

  const story = isLaunch && summary.storyId ? getStory(summary.storyId) : undefined
  // The story's open features, never its launch plan: whether they may start
  // (a blocker not done yet) is the proposal's refusal, shown on the card.
  const features = story ? storyOpenFeatures(story) : []
  // How each feature is worked — the person's pick, never the agent's. Until
  // they pick, the story process's own; the proposal nests whichever is picked.
  const [featureProcessPick, setFeatureProcessPick] = useState<string | undefined>(undefined)
  // The resolved plan the user reads before approving — the whole path per
  // feature, not just the list. A miss falls back to the plain list below.
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
  // The branch the work goes off and back into — the person's pick, else the
  // agent's ask, else the checkout's current branch. Work that joins or builds
  // on an open run goes back where that run's does.
  const [basePick, setBasePick] = useState<string | undefined>(undefined)
  const followsOpenRun =
    openWorkMeta !== undefined &&
    (openWorkChoice === 'extend' || openWorkChoice === 'new-on-branch')
  const baseBranch = baseBranchChoice(proposal?.baseBranches, summary.baseBranch, basePick)
  const baseBranchMeta = followsOpenRun ? undefined : baseBranchMetadata(baseBranch)
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
  const view = featureWorkAskView({
    ...(story?.title ? { storyTitle: story.title } : {}),
    joinsOpenRun,
    args: runProposalArgs(grant),
    ...(proposal?.waitingOn ? { waitingOn: proposal.waitingOn } : {}),
  })
  // Until the preview has answered, whether the story has open work is unknown —
  // a launch then would be refused for want of a choice nobody was shown.
  const check = featureWorkLaunchCheck({
    ...(summary.storyId !== undefined ? { storyId: summary.storyId } : {}),
    proposalLoaded,
    ...(refusal !== undefined ? { refusal } : {}),
    openWorkUnchosen: openWork !== undefined && openWorkMeta === undefined,
    storyLoaded: story !== undefined,
    featureCount: features.length,
  })

  const resolvedBullet = (dep: string): ResolvedDependency =>
    dependencyChipOf(resolveDependency(dep)) ?? { kind: 'missing', display: dep }

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
              ...launchAgentPickMetadata(agentPick),
              turnLimit: processTurnLimitOfView(turnLimit),
              ...(decision === 'once' && openWorkMeta ? openWorkMeta : {}),
              ...(decision === 'once' && featureProcessMeta ? featureProcessMeta : {}),
              ...(decision === 'once' && baseBranchMeta ? baseBranchMeta : {}),
              ...(decision === 'once' && proofPlanMeta ? proofPlanMeta : {}),
            }
          : undefined,
      )
      .then(() => onDecided?.(toolAskDecidedLine(view, decision)))
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  const pill = {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    backgroundColor: theme.surface.muted,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  }
  const tipText = { fontSize: 12, color: theme.text.primary, maxWidth: 280 }

  const sectionHeading = {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: theme.text.muted,
  }
  const linkPill = {
    alignSelf: 'flex-start' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: nativeRadii.round,
    borderWidth: 1,
  }

  return (
    // Bounded by the window, with its own scroll: a story of a dozen features
    // used to push the decision off the screen. Header and decision stay put.
    <View style={{ margin: nativeSpace[3] }}>
      <ToolAskCard
        view={view}
        busy={busy}
        error={error}
        ready={check.ready}
        {...(check.problem !== undefined ? { problem: check.problem } : {})}
        maxHeight={windowHeight * (expanded ? 0.88 : 0.66)}
        onApprove={() => decide('once')}
        onDeny={() => decide('deny')}
        onLater={onDecideLater}
        headerAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Shrink the card' : 'Expand the card'}
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((v) => !v)}
            hitSlop={8}
            style={{
              width: 24,
              height: 24,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 7,
              backgroundColor: theme.surface.raised,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {expanded ? '▾' : '▴'}
            </Text>
          </Pressable>
        }
      >
        {summary.storyId ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: nativeSpace[2],
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[2],
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: theme.border.subtle,
            }}
          >
            <DependencyBullet
              resolved={resolvedBullet(summary.storyId)}
              dependency={summary.storyId}
              // Not pressable: this panel has no navigation seam — a control that
              // looks tappable and does nothing is worse than a plain marker.
              interactive={false}
            />
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}
            >
              {story?.title ?? FEATURE_WORK_ASK.untitled}
            </Text>
          </View>
        ) : null}

        {openWork ? (
          <OpenWorkChooser
            openWork={openWork}
            choice={openWorkChoice}
            busy={busy}
            onChoose={setOpenWorkChoice}
          />
        ) : null}

        <View style={{ gap: 6 }}>
          <Text style={sectionHeading}>{LAUNCH_HOW_IT_RUNS_HEADING}</Text>
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
          <BaseBranchChooser
            options={proposal?.baseBranches}
            {...(summary.baseBranch !== undefined ? { asked: summary.baseBranch } : {})}
            picked={basePick}
            followsOpenRun={followsOpenRun}
            busy={busy}
            onChoose={setBasePick}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: nativeSpace[2],
              flexWrap: 'wrap',
            }}
          >
            {renderModelChip ? (
              renderModelChip(chipSlot)
            ) : (
              <Tooltip content={<Text style={tipText}>{runnerLabel.tip}</Text>}>
                <View style={pill}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: runnerLabel.redirected ? status.working.softFg : theme.text.secondary,
                    }}
                  >
                    {runnerLabel.label}
                  </Text>
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: theme.border.subtle,
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '600', color: theme.text.secondary }}>
                      {runnerLabel.pill}
                    </Text>
                  </View>
                </View>
              </Tooltip>
            )}
          </View>
          <TurnLimitField
            {...turnLimitStart}
            limited={turnLimit.limited}
            maxTurns={turnLimit.maxTurns}
            disabled={busy}
            onChange={setTurnLimitPick}
          />
        </View>

        {featureRows.length > 0 ? (
          <LaunchFeatureList
            {...(summary.storyId ? { storyId: summary.storyId } : {})}
            resolveBullet={resolvedBullet}
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
        ) : features.length > 0 || check.problem === undefined ? (
          <View style={{ gap: 6 }}>
            <Text style={sectionHeading}>Features to work on</Text>
            {features.length === 0 ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>Loading the story…</Text>
            ) : (
              features.map((feature) => (
                <View
                  key={feature.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}
                >
                  {summary.storyId ? (
                    <DependencyBullet
                      resolved={resolvedBullet(`${summary.storyId}.${feature.id}`)}
                      dependency={`${summary.storyId}.${feature.id}`}
                      interactive={false}
                    />
                  ) : null}
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, fontSize: 12.5, color: theme.text.primary }}
                  >
                    {feature.title}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        {flaggedNotes.length > 0 ? (
          // Which stored notes this launch lets the run read (a login, a key).
          // Read-only; approving sanctions the run to read them even if 'ask'.
          // Labels only — never a value.
          <View style={{ gap: 4 }}>
            <Text style={sectionHeading}>Notes this run will use</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {flaggedNotes.map((n) => (
                <ProjectNoteChip key={n.id} note={n} loadValue={() => revealNote(n.id)} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {summary.note ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: agentNoteOpen }}
                onPress={() => setAgentNoteOpen((v) => !v)}
                style={{
                  ...linkPill,
                  borderColor: theme.border.default,
                  backgroundColor: theme.surface.base,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.text.muted }}>
                  {agentNoteOpen ? '▾' : '▸'}
                </Text>
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                  Note from the agent
                </Text>
              </Pressable>
            ) : null}
            {!noteOpen ? (
              // Collapsed by default: most launches need no note.
              <Pressable
                accessibilityRole="button"
                onPress={() => setNoteOpen(true)}
                disabled={busy}
                style={{ ...linkPill, borderStyle: 'dashed', borderColor: theme.border.strong }}
              >
                <Text style={{ fontSize: 13, color: theme.text.muted }}>+</Text>
                <Text style={{ fontSize: 12, color: theme.text.muted }}>
                  Add a note for this run
                </Text>
              </Pressable>
            ) : null}
          </View>
          {summary.note && agentNoteOpen ? (
            <Text
              style={{
                fontSize: 11.5,
                lineHeight: 18,
                color: theme.text.secondary,
                borderRadius: nativeRadii[2],
                borderWidth: 1,
                borderColor: theme.border.subtle,
                backgroundColor: theme.surface.base,
                paddingHorizontal: 8,
                paddingVertical: 6,
              }}
            >
              {summary.note}
            </Text>
          ) : null}
          {noteOpen ? (
            <View style={{ gap: 4 }}>
              <Text style={sectionHeading}>
                Note for this run{' '}
                <Text style={{ fontWeight: '400', letterSpacing: 0, textTransform: 'none' }}>
                  — goes into its opening prompt
                </Text>
              </Text>
              <Textarea
                rows={2}
                value={note}
                onChangeText={setNote}
                disabled={busy}
                maxLength={LAUNCH_NOTE_MAX_CHARS}
                placeholder="(optional) Anything this run should know — a flavour to use, a gotcha, an account to test with…"
              />
            </View>
          ) : null}
        </View>
      </ToolAskCard>
    </View>
  )
}
