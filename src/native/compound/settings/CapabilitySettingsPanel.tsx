import { Text, View } from 'react-native'
import type {
  CapabilityBadge,
  CapabilitySettingsRow,
  CapabilitySettingsView,
} from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Switch } from '../../primitives/Switch'

export function CapabilitySettingsBadge({ badge }: { badge: CapabilityBadge }) {
  const { theme, status } = useNativeTheme()
  const tone = badge.on
    ? {
        backgroundColor: theme.accent.softBg,
        borderColor: theme.accent.softBorder,
        color: theme.accent.softFg,
      }
    : {
        backgroundColor: status.empty.softBg,
        borderColor: status.empty.softBorder,
        color: status.empty.softFg,
      }
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={badge.title}
      testID="capability-settings-badge"
      style={{
        alignSelf: 'flex-start',
        height: 20,
        justifyContent: 'center',
        paddingHorizontal: 6,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: tone.backgroundColor,
        borderColor: tone.borderColor,
      }}
    >
      <Text style={{ fontSize: 10, color: tone.color }}>{badge.label}</Text>
    </View>
  )
}

export interface CapabilitySettingsPanelProps {
  view: CapabilitySettingsView
  error: string | null
  busy: boolean
  onToggle: (row: CapabilitySettingsRow, on: boolean) => void
  onInherit: (row: CapabilitySettingsRow) => void
}

function Row({
  row,
  busy,
  onToggle,
  onInherit,
}: {
  row: CapabilitySettingsRow
  busy: boolean
  onToggle: (row: CapabilitySettingsRow, on: boolean) => void
  onInherit: (row: CapabilitySettingsRow) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      testID={`capability-row-${row.id}`}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[3] }}
    >
      <View style={{ flex: 1, gap: nativeSpace[1] }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
          {row.label}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{row.detail}</Text>
        {row.sourceLabel ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{row.sourceLabel}</Text>
        ) : null}
        {row.inheritLabel ? (
          <Button
            variant="link"
            size="sm"
            disabled={busy}
            onPress={() => onInherit(row)}
            style={{ alignSelf: 'flex-start' }}
          >
            {row.inheritLabel}
          </Button>
        ) : null}
      </View>
      {row.switchable ? (
        <Switch
          checked={row.on}
          disabled={busy || row.disabled}
          accessibilityLabel={row.label}
          testID={`capability-switch-${row.id}`}
          onCheckedChange={(on) => onToggle(row, on)}
        />
      ) : null}
    </View>
  )
}

/**
 * Native peer of [web's `CapabilitySettingsPanel`](../../../web/compound/settings/CapabilitySettingsPanel.tsx):
 * the switches and the at-a-glance badge. Presentational.
 */
export default function CapabilitySettingsPanel({
  view,
  error,
  busy,
  onToggle,
  onInherit,
}: CapabilitySettingsPanelProps) {
  const { theme } = useNativeTheme()
  return (
    <View testID="capability-settings" style={{ gap: nativeSpace[6] }}>
      <View style={{ gap: nativeSpace[2] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: theme.text.primary }}>
            {view.heading}
          </Text>
          <CapabilitySettingsBadge badge={view.badge} />
        </View>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{view.intro}</Text>
      </View>
      {error ? <Alert>{error}</Alert> : null}
      {view.sections.map((section) => (
        <View key={section.id} style={{ gap: nativeSpace[3] }}>
          <View style={{ gap: nativeSpace[1] }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
              {section.heading}
            </Text>
            {section.note ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>{section.note}</Text>
            ) : null}
          </View>
          {section.rows.map((item) => (
            <Row key={item.id} row={item} busy={busy} onToggle={onToggle} onInherit={onInherit} />
          ))}
        </View>
      ))}
    </View>
  )
}
