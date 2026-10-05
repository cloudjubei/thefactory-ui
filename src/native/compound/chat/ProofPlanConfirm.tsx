import ReferenceTextarea from '../files/ReferenceTextarea'
import { Pressable, Text, View } from 'react-native'

import {
  PROOF_PLAN_CONFIRM_DETAIL,
  PROOF_PLAN_CONFIRM_HEADING,
  PROOF_PLAN_EDITED_LABEL,
  PROOF_PLAN_EMPTY_LABEL,
  PROOF_PLAN_EXTEND_NOTE,
  PROOF_PLAN_NOTES_PLACEHOLDER,
  PROOF_PLAN_SAVE_LABEL,
  type LaunchProofPlanRow,
  type ProofKind,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Switch } from '../../primitives/Switch'

export type ProofPlanConfirmProps = {
  rows: readonly LaunchProofPlanRow[]
  /** Write the confirmed plans back onto the features. */
  save: boolean
  /** The features join an open run, which reads their own plans: they are always saved. */
  joinsOpenRun?: boolean
  busy?: boolean
  onToggleKind: (featureId: string, kind: ProofKind) => void
  onNotesChange: (featureId: string, notes: string) => void
  onSaveChange: (save: boolean) => void
}

/**
 * The launch's proof plans for the person starting the work to confirm or add
 * to, every kind this host or process cannot prove flagged with why. Web peer:
 * `web/compound/chat/ProofPlanConfirm`.
 */
export default function ProofPlanConfirm({
  rows,
  save,
  joinsOpenRun = false,
  busy = false,
  onToggleKind,
  onNotesChange,
  onSaveChange,
}: ProofPlanConfirmProps) {
  const { theme, status } = useNativeTheme()
  return (
    <View
      style={{
        gap: 8,
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
        borderRadius: nativeRadii[2],
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <View style={{ gap: 2 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: theme.text.muted,
          }}
        >
          {PROOF_PLAN_CONFIRM_HEADING}
        </Text>
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>
          {PROOF_PLAN_CONFIRM_DETAIL}
        </Text>
      </View>
      {rows.map((row) => (
        <View
          key={row.featureId}
          style={{ gap: 4, borderTopWidth: 1, borderTopColor: theme.border.subtle, paddingTop: 6 }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '500', color: theme.text.primary }}>
            {row.title}
          </Text>
          <Text
            style={{
              fontSize: 10.5,
              color: row.source === 'suggested' ? status.review.softFg : theme.text.muted,
            }}
          >
            {row.sourceLabel}
            {row.edited ? ` · ${PROOF_PLAN_EDITED_LABEL}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {row.kinds.map((kind) => (
              <Pressable
                key={kind.kind}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: kind.checked, disabled: busy }}
                accessibilityHint={
                  kind.unavailable ? `${kind.meaning} ${kind.unavailable}` : kind.meaning
                }
                disabled={busy}
                onPress={() => onToggleKind(row.featureId, kind.kind)}
                style={{
                  borderWidth: 1,
                  borderColor: kind.checked
                    ? kind.unavailable
                      ? status.review.softBorder
                      : theme.accent.primary
                    : theme.border.default,
                  backgroundColor:
                    kind.checked && kind.unavailable ? status.review.softBg : theme.surface.raised,
                  borderRadius: nativeRadii[4],
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: kind.checked ? '600' : '400',
                    color: kind.checked
                      ? kind.unavailable
                        ? status.review.softFg
                        : theme.text.primary
                      : theme.text.secondary,
                    textDecorationLine: !kind.checked && kind.unavailable ? 'line-through' : 'none',
                  }}
                >
                  {kind.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {row.flagged.map((flag) => (
            <Text
              key={flag.kind}
              accessibilityRole="alert"
              style={{ fontSize: 11, color: status.review.softFg }}
            >
              {flag.label} cannot be proven here: {flag.reason}
            </Text>
          ))}
          {row.uiWarning ? (
            <Text accessibilityRole="alert" style={{ fontSize: 11, color: status.review.softFg }}>
              {row.uiWarning}
            </Text>
          ) : null}
          {row.empty ? (
            <Text style={{ fontSize: 11, color: theme.text.muted }}>{PROOF_PLAN_EMPTY_LABEL}</Text>
          ) : null}
          <ReferenceTextarea
            rows={1}
            value={row.notes}
            disabled={busy}
            onChangeText={(notes) => onNotesChange(row.featureId, notes)}
            placeholder={PROOF_PLAN_NOTES_PLACEHOLDER}
            textInputProps={{ accessibilityLabel: `What must be shown: ${row.title}` }}
          />
        </View>
      ))}
      {joinsOpenRun ? (
        <Text style={{ fontSize: 10.5, color: theme.text.muted }}>{PROOF_PLAN_EXTEND_NOTE}</Text>
      ) : (
        <Switch
          checked={save}
          disabled={busy}
          onCheckedChange={onSaveChange}
          label={PROOF_PLAN_SAVE_LABEL}
        />
      )}
    </View>
  )
}
