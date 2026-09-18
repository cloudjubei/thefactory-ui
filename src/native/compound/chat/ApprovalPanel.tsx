import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'
import Tooltip from '../../primitives/Tooltip'
import {
  LAUNCH_NOTE_MAX_CHARS,
  LAUNCH_OPTIONS_READ_ONLY,
  featuresToWorkOn,
  formatGrantDetail,
  isStartFeatureWorkGrant,
  launchOptionsAreHonoured,
  launchRunnerLabel,
  startFeatureWorkGrantSummary,
} from '../../../headless/utils/approvalGrant'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { processProposalView } from '../../../headless/utils/processProposalView'
import { useProcessProposal, useStories } from '../../../headless'
import type { PendingToolGrant } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { red } from '../../../tokens/colors'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import DependencyBullet, { type ResolvedDependency } from '../stories/DependencyBullet'
import ChainChip from '../process/ChainChip'

export type ApprovalPanelProps = {
  grant: PendingToolGrant
  /**
   * The chat's project — used to resolve the launch PROPOSAL shown before
   * approval. The chat's own project, not a global active one. Omitted ⇒ the
   * dock falls back to the plain feature list.
   */
  projectId?: string
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
export default function ApprovalPanel({ grant, projectId, onDecideLater }: ApprovalPanelProps) {
  const { theme, status } = useNativeTheme()
  const isLaunch = isStartFeatureWorkGrant(grant)
  const summary = startFeatureWorkGrantSummary(grant)
  const detail = isLaunch ? undefined : formatGrantDetail(grant.detail)
  const canGrantPermanently =
    !isLaunch && grant.source === 'cli' && grant.canGrantPermanently !== false
  const { getStory, resolveDependency } = useStories()
  // Only a CLI decision carries metadata to the launch; on the API transport the
  // agent's own arguments are what runs, so the options are shown, not offered.
  const optionsHonoured = launchOptionsAreHonoured(grant)
  const runnerLabel = launchRunnerLabel(summary, grant.source)
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [agentNoteOpen, setAgentNoteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const story = isLaunch && summary.storyId ? getStory(summary.storyId) : undefined
  const features = story ? featuresToWorkOn(story) : []
  // The resolved plan the user reads before approving — the whole path per
  // feature, not just the list. A miss falls back to the plain list below.
  const { proposal } = useProcessProposal({
    projectId,
    storyId: isLaunch ? summary.storyId : undefined,
  })
  const proposalView = proposal ? processProposalView(proposal) : undefined

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
              // Proof is no longer a dock toggle — it belongs to the process the
              // agent chose (its Verify → Report chain), so the launch carries
              // the agent's own choice unchanged rather than overriding it here.
              ...(trimmedNote ? { note: trimmedNote } : {}),
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
          {canGrantPermanently ? (
            <Button variant="ghost" size="sm" onPress={() => decide('permanent')} disabled={busy}>
              Always allow
            </Button>
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

  return (
    <View
      style={{
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[3],
        borderTopWidth: 1,
        borderTopColor: theme.border.strong ?? theme.border.subtle,
        backgroundColor: theme.surface.raised ?? theme.surface.muted,
        gap: nativeSpace[2],
      }}
    >
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
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          Start work on this story?
        </Text>
      </View>

      {summary.storyId ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: nativeSpace[2],
            flexWrap: 'wrap',
          }}
        >
          <DependencyBullet
            resolved={resolvedBullet(summary.storyId)}
            dependency={summary.storyId}
            // Not pressable: web's bullet is a connected component that routes to
            // the story, and this panel has no navigation seam — a control that
            // looks tappable and does nothing is worse than a plain marker.
            interactive={false}
          />
          <Text
            style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary, flexShrink: 1 }}
          >
            {story?.title ?? 'Story'}
          </Text>
        </View>
      ) : null}

      {proposalView && proposalView.features.length > 0 ? (
        <View
          style={{
            gap: nativeSpace[2],
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.muted,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: theme.text.secondary,
              }}
            >
              The process
            </Text>
            <Text style={{ fontSize: 10, color: theme.text.muted }}>
              {proposalView.features.length} feature
              {proposalView.features.length === 1 ? '' : 's'} · {proposalView.agentStepCount} agent
              step{proposalView.agentStepCount === 1 ? '' : 's'}
            </Text>
          </View>
          {proposalView.features.map((feature, i) => (
            <View key={feature.id} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
                <Text
                  style={{
                    width: 16,
                    textAlign: 'right',
                    fontSize: 10,
                    color: theme.text.secondary,
                  }}
                >
                  {i + 1}
                </Text>
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
              {feature.chain.length > 0 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 4,
                    marginLeft: 24,
                  }}
                >
                  {feature.chain.map((chip, j) => (
                    <View
                      key={chip.id}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      {j > 0 ? (
                        <Text style={{ color: theme.border.strong, fontSize: 11 }}>›</Text>
                      ) : null}
                      <ChainChip chip={chip} />
                    </View>
                  ))}
                  {feature.maxIterations && feature.maxIterations > 1 ? (
                    <Text style={{ fontSize: 10, color: theme.text.muted, marginLeft: 2 }}>
                      · up to {feature.maxIterations} attempts
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
          {proposalView.tail.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 4,
                marginLeft: 24,
                borderTopWidth: 1,
                borderTopColor: theme.border.subtle,
                paddingTop: 6,
              }}
            >
              {proposalView.tail.map((chip, j) => (
                <View key={chip.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {j > 0 ? (
                    <Text style={{ color: theme.border.strong, fontSize: 11 }}>›</Text>
                  ) : null}
                  <ChainChip chip={chip} />
                </View>
              ))}
            </View>
          ) : null}
          <Text style={{ fontSize: 10.5, color: theme.text.muted }}>
            Not included: merging. Nothing lands without your sign-off.
          </Text>
        </View>
      ) : (
        <View
          style={{
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.muted,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: theme.text.secondary,
            }}
          >
            Features to work on
          </Text>
          {features.length === 0 ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {story
                ? 'No feature on this story is ready — it will be refused when launched.'
                : 'Loading the story…'}
            </Text>
          ) : (
            features.map((feature, i) => (
              <View
                key={feature.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}
              >
                <Text
                  style={{
                    width: 16,
                    textAlign: 'right',
                    fontSize: 10,
                    color: theme.text.secondary,
                  }}
                >
                  {i + 1}
                </Text>
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
              The run gets its own copy of the repo and its own branch. Your files and the branch
              you are on are never touched, even if it fails.
            </Text>
          }
        >
          <View style={pill}>
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>Isolated copy</Text>
          </View>
        </Tooltip>
      </View>

      {summary.note ? (
        // The agent's own note, when it wrote one. Collapsed to a chip: context
        // worth reading before approving, not worth a standing block. Sits ABOVE
        // the user's own note — the agent briefed the run first.
        <View style={{ gap: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: agentNoteOpen }}
            onPress={() => setAgentNoteOpen((v) => !v)}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: nativeRadii.round,
              borderWidth: 1,
              borderColor: theme.border.default,
              backgroundColor: theme.surface.base,
            }}
          >
            <Text style={{ fontSize: 11, color: theme.text.muted }}>
              {agentNoteOpen ? '▾' : '▸'}
            </Text>
            <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>Note from the agent</Text>
          </Pressable>
          {agentNoteOpen ? (
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
        </View>
      ) : null}

      {optionsHonoured && !noteOpen ? (
        // Collapsed by default: most launches need no note, and an empty box
        // asks every user to decide about something almost none of them want.
        <Pressable
          accessibilityRole="button"
          onPress={() => setNoteOpen(true)}
          disabled={busy}
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: nativeRadii.round,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: theme.border.strong,
          }}
        >
          <Text style={{ fontSize: 13, color: theme.text.muted }}>+</Text>
          <Text style={{ fontSize: 11.5, color: theme.text.muted }}>Add a note for this run</Text>
        </Pressable>
      ) : null}

      {optionsHonoured && noteOpen ? (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: theme.text.secondary,
            }}
          >
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
      ) : (
        <Text style={{ fontSize: 11.5, color: theme.text.muted }}>{LAUNCH_OPTIONS_READ_ONLY}</Text>
      )}

      {errorBox}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          flexWrap: 'wrap',
        }}
      >
        <Tooltip
          content={
            <Text style={tipText}>
              {`${features.length} feature${features.length === 1 ? ' is' : 's are'} picked up, an isolated copy is made and the agent begins. You can watch it, and you can cancel it at any point. Merges nothing; your branch is not touched.`}
            </Text>
          }
        >
          <Button
            size="sm"
            variant="primary"
            onPress={() => decide('once')}
            loading={busy}
            // `features` is legitimately empty while the story loads.
            disabled={story !== undefined && features.length === 0}
          >
            Start work
          </Button>
        </Tooltip>
        <Tooltip
          content={
            <Text style={tipText}>
              The run is not started and the story is left exactly as it is. The agent is told you
              said no, so it can suggest something else or wait. Nothing is cancelled or deleted,
              and you can ask again at any time.
            </Text>
          }
        >
          <Button variant="danger" size="sm" onPress={() => decide('deny')} disabled={busy}>
            No — cancel
          </Button>
        </Tooltip>
      </View>
    </View>
  )
}
