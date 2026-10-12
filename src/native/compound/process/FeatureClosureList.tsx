import { Text, View } from 'react-native'
import {
  processRunClosureOptions,
  type ProcessFeatureClosureStatus,
  type ProcessRunClosureRow,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type FeatureClosureListProps = {
  rows: readonly ProcessRunClosureRow[]
  onPick: (
    featureId: string,
    pick: { status?: ProcessFeatureClosureStatus; reason?: string },
  ) => void
  disabled?: boolean
}

/**
 * The features of a run that ended without a sign-off, each with what it is now,
 * what the run did on it, and a pick of what it is left as — the same on the
 * run's page and on an agent's card.
 */
export function FeatureClosureList({ rows, onPick, disabled }: FeatureClosureListProps) {
  const { theme } = useNativeTheme()
  const options = processRunClosureOptions()
  return (
    <View style={{ gap: nativeSpace[2] }}>
      {rows.map((row) => (
        <View
          key={row.featureId}
          style={{
            gap: nativeSpace[1],
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
            padding: nativeSpace[2],
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
              {row.title}
            </Text>
            <Text style={{ fontSize: 10, color: theme.text.muted }}>now {row.currentStatus}</Text>
          </View>
          {row.work.length > 0 ? (
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>{row.work.join(' ')}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[1] }}>
            {options.map((o) => (
              <Button
                key={o.status}
                size="sm"
                variant={row.status === o.status ? 'primary' : 'secondary'}
                accessibilityLabel={o.label}
                accessibilityState={{ selected: row.status === o.status }}
                disabled={disabled}
                onPress={() => onPick(row.featureId, { status: o.status })}
              >
                {o.status}
              </Button>
            ))}
          </View>
          {row.status === 'blocked' ? (
            <Input
              value={row.reason}
              placeholder="Why is it blocked?"
              disabled={disabled}
              onChangeText={(reason) => onPick(row.featureId, { reason })}
            />
          ) : null}
          <Text style={{ fontSize: 10, color: theme.text.muted }}>
            {row.status === row.suggested ? row.why : `Suggested: ${row.suggested} — ${row.why}`}
          </Text>
        </View>
      ))}
    </View>
  )
}

export default FeatureClosureList
