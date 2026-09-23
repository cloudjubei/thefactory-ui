import { Text, View } from 'react-native'

import type { RunModel } from '../../../../headless'
import { nativeAlpha, nativePalette, nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import Tooltip from '../../../primitives/Tooltip'

export type RunModelChipProps = {
  model: RunModel | undefined
  /** The agent role that ran — `developer`, `verifier`. Adds the provenance line. */
  role?: string
}

/**
 * Native peer of the web `RunModelChip`: which agent and model did the work,
 * read-only. A landed run's model is a fact, not a picker. When a `role` is
 * given it leads the model with the role — the "Run by" chip per section.
 */
export default function RunModelChip({ model, role }: RunModelChipProps) {
  const { theme } = useNativeTheme()
  if (!model) return null
  const line = model.model ?? model.tool
  if (!line) return null
  return (
    <Tooltip
      content={
        <Text style={{ fontSize: 12, color: theme.text.primary, maxWidth: 260 }}>
          {role ? `${role} · ` : ''}
          {model.model
            ? `Ran on ${model.tag} — model ${model.model}${model.effort ? `, ${model.effort} effort` : ''}.`
            : `Ran on ${model.tag}. The runner did not record a model for this run.`}
        </Text>
      }
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          height: 22,
          paddingLeft: 5,
          paddingRight: 8,
          borderRadius: nativeRadii.round,
          borderWidth: 1,
          borderColor: theme.border.default,
          backgroundColor: theme.surface.base,
        }}
      >
        <View
          style={{
            borderRadius: 3,
            paddingHorizontal: 3,
            backgroundColor: nativeAlpha(nativePalette.purple[650], 0.22),
          }}
        >
          <Text
            style={{
              fontSize: 8.5,
              fontWeight: '700',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color:
                theme.colorScheme === 'dark'
                  ? nativePalette.purple[100]
                  : nativePalette.purple[700],
            }}
          >
            {model.tag}
          </Text>
        </View>
        {role ? (
          <View style={{ flexDirection: 'column' }}>
            <Text
              style={{
                fontSize: 9,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: theme.text.muted,
              }}
            >
              {role}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                maxWidth: 128,
                fontSize: 11.5,
                fontWeight: '500',
                color: theme.text.primary,
              }}
            >
              {line}
            </Text>
          </View>
        ) : (
          <Text
            numberOfLines={1}
            style={{ maxWidth: 128, fontSize: 11.5, fontWeight: '500', color: theme.text.primary }}
          >
            {line}
          </Text>
        )}
      </View>
    </Tooltip>
  )
}
