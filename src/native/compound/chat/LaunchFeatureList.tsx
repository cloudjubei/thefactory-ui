import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import ReferenceTextarea from '../files/ReferenceTextarea'
import ChainChip from '../process/ChainChip'
import {
  LAUNCH_FEATURE_LEFT_OUT,
  LAUNCH_FEATURES_HEADING,
  PROOF_PLAN_EDITED_LABEL,
  PROOF_PLAN_EMPTY_LABEL,
  PROOF_PLAN_EMPTY_SHORT,
  PROOF_PLAN_EXTEND_NOTE,
  PROOF_PLAN_NOTES_PLACEHOLDER,
  PROOF_PLAN_SAVE_LABEL,
  launchFeaturePickCount,
  type LaunchFeaturePickRow,
  type LaunchFeatureRow,
  type ProofKind,
  type ProposalChip,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Switch } from '../../primitives/Switch'
import type { ResolvedDependency } from '../stories/DependencyBullet'
import DependencyBullet from '../stories/DependencyBullet'

export type LaunchFeatureListProps = {
  /** The story the features belong to — names each one by its bullet. */
  storyId?: string
  /** How a feature's bullet resolves — the host's story lookup. */
  resolveBullet: (dependency: string) => ResolvedDependency
  rows: readonly LaunchFeatureRow[]
  /** Story-level steps run once after the features — the sign-off, chiefly. */
  tail: readonly ProposalChip[]
  /** Steps where a model runs, across the whole plan. */
  agentStepCount?: number
  /** Write the confirmed plans back onto the features. */
  save: boolean
  /** The features join an open run, which reads their own plans: they are always saved. */
  joinsOpenRun?: boolean
  busy?: boolean
  onToggleKind: (featureId: string, kind: ProofKind) => void
  onNotesChange: (featureId: string, notes: string) => void
  onSaveChange: (save: boolean) => void
  /**
   * The story's open features to pick from — every one listed, those left out
   * dimmed, each ticked in or out. Absent: the launch works the rows as they are.
   */
  pick?: {
    rows: readonly LaunchFeaturePickRow[]
    onToggle: (featureId: string) => void
  }
}

/**
 * Native peer of [web's `LaunchFeatureList`](../../../web/compound/chat/LaunchFeatureList.tsx):
 * each feature once, how it is proven as a short summary opened for editing on
 * demand, and its pipeline steps on demand, so a long story still fits the sheet.
 */
export default function LaunchFeatureList({
  storyId,
  resolveBullet,
  rows,
  tail,
  agentStepCount,
  save,
  joinsOpenRun = false,
  busy = false,
  onToggleKind,
  onNotesChange,
  onSaveChange,
  pick,
}: LaunchFeatureListProps) {
  const { theme, status } = useNativeTheme()
  const [editing, setEditing] = useState<ReadonlySet<string>>(new Set())
  const [showSteps, setShowSteps] = useState(false)
  const hasSteps = rows.some((r) => r.chain.length > 0) || tail.length > 0
  const anyEdited = rows.some((r) => r.proof?.edited)
  const listed = pick
    ? pick.rows
    : rows.map((r) => ({ featureId: r.featureId, title: r.title, picked: true }))
  const pickedCount = listed.filter((item) => item.picked).length
  const pickBox = (item: LaunchFeaturePickRow) =>
    pick ? (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.picked, disabled: busy }}
        accessibilityLabel={`${item.picked ? 'Leave out' : 'Work on'} “${item.title}”`}
        disabled={busy}
        onPress={() => pick.onToggle(item.featureId)}
        hitSlop={8}
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: item.picked ? theme.accent.primary : theme.border.strong,
          backgroundColor: item.picked ? theme.accent.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.picked ? (
          <Text style={{ fontSize: 12, color: theme.text.inverted, fontWeight: '700' }}>✓</Text>
        ) : null}
      </Pressable>
    ) : null
  const cardStyle = {
    gap: 6,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    backgroundColor: theme.surface.base,
    borderRadius: nativeRadii[3],
    paddingHorizontal: 10,
    paddingVertical: 8,
  } as const
  const toggleEditing = (featureId: string) =>
    setEditing((prev) => {
      const next = new Set(prev)
      if (next.has(featureId)) next.delete(featureId)
      else next.add(featureId)
      return next
    })
  const chain = (chips: readonly ProposalChip[]) =>
    chips.map((chip, j) => (
      <View key={chip.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {j > 0 ? <Text style={{ color: theme.border.strong, fontSize: 11 }}>›</Text> : null}
        <ChainChip chip={chip} />
      </View>
    ))

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: theme.text.muted,
          }}
        >
          {LAUNCH_FEATURES_HEADING}
        </Text>
        <Text style={{ fontSize: 11, color: theme.text.muted, flexShrink: 1 }}>
          {launchFeaturePickCount(pickedCount, listed.length)}
          {agentStepCount !== undefined
            ? ` · ${agentStepCount} agent step${agentStepCount === 1 ? '' : 's'}`
            : ''}
        </Text>
        {hasSteps ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showSteps }}
            onPress={() => setShowSteps((v) => !v)}
            hitSlop={8}
            style={{ marginLeft: 'auto', paddingVertical: 4 }}
          >
            <Text style={{ fontSize: 12, color: theme.accent.primary }}>
              {showSteps ? 'Hide steps' : 'Show steps'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {listed.map((item) => {
        const row = item.picked ? rows.find((r) => r.featureId === item.featureId) : undefined
        if (!row) {
          return (
            <View
              key={item.featureId}
              style={[
                cardStyle,
                { flexDirection: 'row', alignItems: 'center', gap: 8 },
                item.picked ? null : { opacity: 0.6 },
              ]}
            >
              {pickBox(item)}
              {storyId ? (
                <DependencyBullet
                  resolved={resolveBullet(`${storyId}.${item.featureId}`)}
                  dependency={`${storyId}.${item.featureId}`}
                  interactive={false}
                />
              ) : null}
              <Text
                numberOfLines={2}
                style={{ flex: 1, fontSize: 13, fontWeight: '500', color: theme.text.primary }}
              >
                {item.title}
              </Text>
              {item.picked ? null : (
                <Text style={{ fontSize: 11, color: theme.text.muted }}>
                  {LAUNCH_FEATURE_LEFT_OUT}
                </Text>
              )}
            </View>
          )
        }
        const proof = row.proof
        const open = proof !== undefined && editing.has(row.featureId)
        return (
          <View key={row.featureId} style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {pickBox(item)}
              {storyId ? (
                <DependencyBullet
                  resolved={resolveBullet(`${storyId}.${row.featureId}`)}
                  dependency={`${storyId}.${row.featureId}`}
                  interactive={false}
                />
              ) : null}
              <Text
                numberOfLines={2}
                style={{ flex: 1, fontSize: 13, fontWeight: '500', color: theme.text.primary }}
              >
                {row.title}
              </Text>
            </View>

            {proof ? (
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}
              >
                {(open ? proof.kinds : proof.kinds.filter((k) => k.checked)).map((kind) => (
                  <Pressable
                    key={kind.kind}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: kind.checked,
                      disabled: busy || !open || kind.disabled,
                    }}
                    accessibilityHint={
                      kind.unavailable ? `${kind.meaning} ${kind.unavailable}` : kind.meaning
                    }
                    disabled={busy || !open || kind.disabled}
                    onPress={() => onToggleKind(row.featureId, kind.kind)}
                    style={{
                      minHeight: 32,
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: kind.checked
                        ? kind.unavailable
                          ? status.review.softBorder
                          : theme.accent.primary
                        : theme.border.default,
                      backgroundColor:
                        kind.checked && kind.unavailable
                          ? status.review.softBg
                          : theme.surface.raised,
                      borderRadius: nativeRadii.round,
                      paddingHorizontal: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: kind.checked ? '600' : '400',
                        color: kind.checked
                          ? kind.unavailable
                            ? status.review.softFg
                            : theme.text.primary
                          : theme.text.secondary,
                        textDecorationLine:
                          !kind.checked && kind.unavailable ? 'line-through' : 'none',
                      }}
                    >
                      {kind.label}
                    </Text>
                  </Pressable>
                ))}
                {!open && row.proofLabels.length === 0 ? (
                  <Text style={{ fontSize: 12, color: theme.text.muted }}>
                    {PROOF_PLAN_EMPTY_SHORT}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open, disabled: busy }}
                  accessibilityLabel={`${open ? 'Done editing' : 'Edit'} how “${row.title}” is proven`}
                  disabled={busy}
                  onPress={() => toggleEditing(row.featureId)}
                  hitSlop={6}
                  style={{
                    marginLeft: 'auto',
                    minHeight: 32,
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ fontSize: 13, color: theme.accent.primary }}>
                    {open ? 'Done' : 'Edit'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {proof ? (
              <Text
                style={{
                  fontSize: 10.5,
                  color:
                    proof.source === 'suggested' && !proof.edited
                      ? status.review.softFg
                      : theme.text.muted,
                }}
              >
                {proof.edited ? PROOF_PLAN_EDITED_LABEL : proof.sourceLabel}
              </Text>
            ) : null}
            {proof?.flagged.map((flag) => (
              <Text
                key={flag.kind}
                accessibilityRole="alert"
                style={{ fontSize: 11, color: status.review.softFg }}
              >
                {flag.label} cannot be proven here: {flag.reason}
              </Text>
            ))}
            {proof?.dropped.map((line) => (
              <Text key={line} style={{ fontSize: 11, color: theme.text.secondary }}>
                {line}
              </Text>
            ))}
            {proof?.uiWarning ? (
              <Text
                accessibilityRole="alert"
                style={{
                  fontSize: 11.5,
                  color: status.review.softFg,
                  backgroundColor: status.review.softBg,
                  borderRadius: nativeRadii[2],
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                }}
              >
                {proof.uiWarning}
              </Text>
            ) : null}
            {proof?.uiHint ? (
              <Text style={{ fontSize: 11, color: theme.text.secondary }}>{proof.uiHint}</Text>
            ) : null}
            {open && proof ? (
              <>
                {proof.empty ? (
                  <Text style={{ fontSize: 11, color: theme.text.muted }}>
                    {PROOF_PLAN_EMPTY_LABEL}
                  </Text>
                ) : null}
                <ReferenceTextarea
                  rows={1}
                  value={proof.notes}
                  disabled={busy}
                  onChangeText={(notes) => onNotesChange(row.featureId, notes)}
                  placeholder={PROOF_PLAN_NOTES_PLACEHOLDER}
                  textInputProps={{ accessibilityLabel: `What must be shown: ${row.title}` }}
                />
              </>
            ) : null}

            {showSteps && row.chain.length > 0 ? (
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}
              >
                {chain(row.chain)}
                {row.maxIterations && row.maxIterations > 1 ? (
                  <Text style={{ fontSize: 10, color: theme.text.muted, marginLeft: 2 }}>
                    · up to {row.maxIterations} attempts
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        )
      })}

      {showSteps && tail.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 11, color: theme.text.secondary, marginRight: 2 }}>
            Then the story:
          </Text>
          {chain(tail)}
        </View>
      ) : null}

      {joinsOpenRun && rows.some((r) => r.proof) ? (
        <Text style={{ fontSize: 10.5, color: theme.text.muted }}>{PROOF_PLAN_EXTEND_NOTE}</Text>
      ) : anyEdited ? (
        <Switch
          checked={save}
          disabled={busy}
          onCheckedChange={onSaveChange}
          label={PROOF_PLAN_SAVE_LABEL}
        />
      ) : null}
    </View>
  )
}
