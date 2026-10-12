import { Text, View } from 'react-native'
import { Slider } from '../primitives/Slider'
import { Switch } from '../primitives/Switch'
import { nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export type TurnLimitFieldProps = {
  /** The switch's label, e.g. "Limit turns per run". */
  label: string
  /** What the limit means, under the label. */
  hint: string
  /** The slider's label, e.g. "Max turns per run". */
  sliderLabel: string
  limited: boolean
  maxTurns: number
  min: number
  max: number
  disabled?: boolean
  onChange: (next: { limited: boolean; maxTurns: number }) => void
}

/** The "limit turns" switch with the slider it reveals — the same wherever a turn limit is set. */
export function TurnLimitField({
  label,
  hint,
  sliderLabel,
  limited,
  maxTurns,
  min,
  max,
  disabled,
  onChange,
}: TurnLimitFieldProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: nativeSpace[3],
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
            {label}
          </Text>
          <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>{hint}</Text>
        </View>
        <Switch
          checked={limited}
          {...(disabled ? { disabled } : {})}
          onCheckedChange={(checked) => onChange({ limited: checked, maxTurns })}
        />
      </View>
      {limited ? (
        <View style={{ gap: nativeSpace[1] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
              {sliderLabel}
            </Text>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>{maxTurns}</Text>
          </View>
          <Slider
            value={maxTurns}
            min={min}
            max={max}
            onChange={(v) => onChange({ limited, maxTurns: v })}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 10, color: theme.text.muted }}>{min}</Text>
            <Text style={{ fontSize: 10, color: theme.text.muted }}>{max}</Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}

export default TurnLimitField
