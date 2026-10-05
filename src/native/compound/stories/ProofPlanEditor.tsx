import { Pressable, Text, View } from 'react-native'
import ReferenceTextarea from '../files/ReferenceTextarea'

import {
  PROOF_PLAN_AUTOMATIC_LABEL,
  PROOF_PLAN_EDITOR_HINT,
  PROOF_PLAN_EDITOR_LABEL,
  PROOF_PLAN_INHERITS_PREFIX,
  PROOF_PLAN_NOTES_PLACEHOLDER,
  proofKindOptions,
  proofPlanSummaryLine,
  type ProofKind,
  type ProofPlan,
  type ProofPlanDraft,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ProofPlanEditorProps = {
  draft: ProofPlanDraft
  onToggleKind: (kind: ProofKind) => void
  onNotesChange: (notes: string) => void
  /** The story's plan, which a feature with none of its own inherits. */
  inherited?: ProofPlan
  disabled?: boolean
}

/**
 * The feature editor's proof plan: the kinds of proof that would show the
 * change is right, and what specifically must be shown. Web peer:
 * `web/compound/stories/ProofPlanEditor`.
 */
export default function ProofPlanEditor({
  draft,
  onToggleKind,
  onNotesChange,
  inherited,
  disabled = false,
}: ProofPlanEditorProps) {
  const { theme } = useNativeTheme()
  const empty = draft.kinds.length === 0
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{PROOF_PLAN_EDITOR_LABEL}</Text>
      <View
        accessibilityLabel={PROOF_PLAN_EDITOR_LABEL}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
      >
        {proofKindOptions().map((option) => {
          const picked = draft.kinds.includes(option.kind)
          return (
            <Pressable
              key={option.kind}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: picked, disabled }}
              accessibilityHint={option.meaning}
              disabled={disabled}
              onPress={() => onToggleKind(option.kind)}
              style={{
                borderWidth: 1,
                borderColor: picked ? theme.accent.primary : theme.border.default,
                backgroundColor: theme.surface.raised,
                borderRadius: nativeRadii[4],
                paddingHorizontal: 10,
                paddingVertical: 5,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: picked ? '600' : '400',
                  color: picked ? theme.text.primary : theme.text.secondary,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <ReferenceTextarea
        rows={2}
        value={draft.notes}
        onChangeText={onNotesChange}
        disabled={disabled}
        placeholder={PROOF_PLAN_NOTES_PLACEHOLDER}
        textInputProps={{ accessibilityLabel: `${PROOF_PLAN_EDITOR_LABEL} notes` }}
      />
      <Text style={{ fontSize: 12, color: theme.text.muted }}>
        {empty
          ? inherited
            ? `${PROOF_PLAN_INHERITS_PREFIX} ${proofPlanSummaryLine(inherited)}`
            : PROOF_PLAN_AUTOMATIC_LABEL
          : PROOF_PLAN_EDITOR_HINT}
      </Text>
    </View>
  )
}
