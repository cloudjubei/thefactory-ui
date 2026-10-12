import { useRef, useState } from 'react'
import { useCanonicalizeReferences } from '../../../headless/contexts/ReferenceRenderingContext'
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'

import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'
import Tooltip from '../../primitives/Tooltip'
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
import RichText from '../files/RichText'
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
import { red } from '../../../tokens/colors'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import DependencyBullet, { type ResolvedDependency } from '../stories/DependencyBullet'
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
  onDecideLater: () => void
}

/**
 * Native peer of [web's `ApprovalPanel`](../../../web/compound/chat/ApprovalPanel.tsx).
 * Takes the composer's place so the ask is unmissable while the chat stays
 * visible; `onDecideLater` parks a tool ask and hands the composer back. A
 * launch renders as the dock — story, features in pick-up order, what "yes"
 * does, a note for the run — everything else shows the tool and its arguments.
 * The dock answers either way and offers no park; see the web peer for why, and
 * for why this takes no external busy flag.
 */
export default function ApprovalPanel(props: ApprovalPanelProps) {
  // Putting a project on GitHub names an account, a repository and a
  // visibility the user must see and may change — it has its own card.
  if (isStartGroupWorkGrant(props.grant)) {
    return (
      <GroupWorkLaunchPanel
        grant={props.grant}
        {...(props.groupId !== undefined ? { groupId: props.groupId } : {})}
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

function ToolApprovalPanel({ grant, projectId, onDecideLater }: ApprovalPanelProps) {
  const { theme, status } = useNativeTheme()
  const isLaunch = isStartFeatureWorkGrant(grant)
  const summary = startFeatureWorkGrantSummary(grant)
  const { headline, detail }: GrantDetailView = isLaunch ? {} : grantDetailView(grant.detail)
  const alwaysAllowScopes = !isLaunch ? (grant.alwaysAllowScopes ?? []) : []
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // How far each step's agent may go — the person's pick, else what the agent
  // asked for, else the default for the transport the work runs on.
  const turnLimitStart = processGrantTurnLimitView(
    summary.turnLimit,
    summary.runner ?? grant.chatRunner,
  )
  const [turnLimitPick, setTurnLimitPick] = useState<
    { limited: boolean; maxTurns: number } | undefined
  >(undefined)
  const turnLimit = turnLimitPick ?? turnLimitStart

  const story = isLaunch && summary.storyId ? getStory(summary.storyId) : undefined
  const features = story ? featuresToWork(story) : []
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

  const resolvedBullet = (dep: string): ResolvedDependency => {
    const resolved = resolveDependency(dep)
    if ('code' in resolved) return { kind: 'missing', display: dep }
    if (resolved.kind === 'story') {
      const s = resolved.story
      return {
        kind: 'story',
        display: resolved.display,
        storyId: resolved.storyId,
        story: {
          id: s.id,
          title: s.title,
          description: s.description,
          status: s.status,
          blockers: s.blockers,
        },
      }
    }
    const f = resolved.feature
    return {
      kind: 'feature',
      display: resolved.display,
      storyId: resolved.storyId,
      featureId: resolved.featureId,
      feature: {
        id: f.id,
        title: f.title,
        description: f.description,
        status: f.status,
        blockers: f.blockers,
      },
    }
  }

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

  const errorBox =
    error !== null ? (
      <View
        style={{
          padding: nativeSpace[3],
          borderRadius: nativeRadii[3],
          borderWidth: 1,
          borderColor: red[500],
        }}
      >
        <Text style={{ fontSize: 13, color: red[600] }}>{error}</Text>
      </View>
    ) : null

  if (!isLaunch) {
    return (
      <View
        style={{
          margin: nativeSpace[3],
          padding: nativeSpace[4],
          borderRadius: nativeRadii[3],
          borderWidth: 1,
          borderColor: theme.border.strong ?? theme.border.subtle,
          backgroundColor: theme.surface.raised ?? theme.surface.muted,
          gap: nativeSpace[3],
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
          The agent needs your approval
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {`It is waiting on this before it can continue: ${grant.label}`}
        </Text>
        {headline !== undefined ? <RichText text={headline} /> : null}
        {detail !== undefined ? (
          <View
            style={{
              padding: nativeSpace[3],
              borderRadius: nativeRadii[3],
              backgroundColor: theme.surface.muted,
            }}
          >
            <ScrollView style={{ maxHeight: 160 }}>
              <Text
                selectable
                style={{ fontSize: 12, fontFamily: 'Courier', color: theme.text.primary }}
              >
                {detail}
              </Text>
            </ScrollView>
          </View>
        ) : null}
        {errorBox}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: nativeSpace[2],
            flexWrap: 'wrap',
          }}
        >
          <Button variant="ghost" size="sm" onPress={onDecideLater} disabled={busy}>
            Decide later
          </Button>
          {alwaysAllowScopes.length > 0 ? (
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
          ) : null}
          <Button variant="secondary" size="sm" onPress={() => decide('deny')} disabled={busy}>
            Not now
          </Button>
          <Button size="sm" onPress={() => decide('once')} loading={busy}>
            Approve
          </Button>
        </View>
      </View>
    )
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
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: theme.border.strong ?? theme.border.subtle,
        backgroundColor: theme.surface.raised ?? theme.surface.muted,
        ...(expanded ? { height: windowHeight * 0.88 } : { maxHeight: windowHeight * 0.66 }),
      }}
    >
      <View
        style={{
          paddingHorizontal: nativeSpace[3],
          paddingTop: nativeSpace[3],
          paddingBottom: nativeSpace[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: nativeSpace[2],
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <View
              style={{
                ...pill,
                height: 20,
                paddingHorizontal: 6,
                borderStyle: 'dashed',
                borderColor: status.review.softBorder,
                backgroundColor: 'transparent',
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: status.review.softFg,
                }}
              />
              <Text style={{ fontSize: 10, color: status.review.softFg }}>Needs you</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
              Start work on this story?
            </Text>
          </View>
          {summary.storyId ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
              <DependencyBullet
                resolved={resolvedBullet(summary.storyId)}
                dependency={summary.storyId}
                // Not pressable: this panel has no navigation seam — a control that
                // looks tappable and does nothing is worse than a plain marker.
                interactive={false}
              />
              <Text
                numberOfLines={1}
                style={{ flex: 1, fontSize: 13, color: theme.text.secondary }}
              >
                {story?.title ?? 'Story'}
              </Text>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Shrink the card' : 'Expand the card'}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.default,
          }}
        >
          <Text style={{ fontSize: 14, color: theme.text.secondary }}>{expanded ? '▾' : '▴'}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ padding: nativeSpace[3], gap: nativeSpace[3] }}
        keyboardShouldPersistTaps="handled"
      >
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: nativeSpace[2],
              flexWrap: 'wrap',
            }}
          >
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
            <Tooltip
              content={
                <Text style={tipText}>
                  The run gets its own copy of the repo and its own branch. Your files and the
                  branch you are on are never touched, even if it fails.
                </Text>
              }
            >
              <View style={pill}>
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>Isolated copy</Text>
              </View>
            </Tooltip>
            <Text style={{ fontSize: 11.5, color: theme.text.muted }}>Merges nothing.</Text>
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
        ) : (
          <View style={{ gap: 6 }}>
            <Text style={sectionHeading}>Features to work on</Text>
            {refusal !== undefined ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>{refusal}</Text>
            ) : features.length === 0 ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                {story
                  ? 'Every feature on this story is done or deferred — it will be refused when launched.'
                  : 'Loading the story…'}
              </Text>
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
        )}

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
      </ScrollView>

      <View
        style={{
          paddingHorizontal: nativeSpace[3],
          paddingTop: nativeSpace[2],
          paddingBottom: nativeSpace[3],
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
          gap: nativeSpace[2],
        }}
      >
        {errorBox}
        <Tooltip
          content={
            <Text style={tipText}>
              {`${features.length} feature${features.length === 1 ? ' is' : 's are'} picked up, an isolated copy is made and the agent begins. You can watch it, and you can cancel it at any point. Merges nothing; your branch is not touched.`}
            </Text>
          }
        >
          <Button
            size="md"
            variant="primary"
            onPress={() => decide('once')}
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
        <View style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
          <View style={{ flex: 1 }}>
            <Button variant="ghost" size="md" onPress={onDecideLater} disabled={busy}>
              Decide later
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Tooltip
              content={
                <Text style={tipText}>
                  The run is not started and the story is left exactly as it is. The agent is told
                  you said no, so it can suggest something else or wait. Nothing is cancelled or
                  deleted, and you can ask again at any time.
                </Text>
              }
            >
              <Button variant="danger" size="md" onPress={() => decide('deny')} disabled={busy}>
                No — cancel
              </Button>
            </Tooltip>
          </View>
        </View>
        <Text style={{ fontSize: 11, color: theme.text.muted, textAlign: 'center' }}>
          Nothing lands without your sign-off.
        </Text>
      </View>
    </View>
  )
}
