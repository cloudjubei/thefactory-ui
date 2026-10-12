import { Text, View } from 'react-native'
import {
  processCleanupEditable,
  processCleanupHeadline,
  processCleanupRows,
  useProcessCleanup,
} from '../../../../headless'
import { PROCESS_CLEANUP_COPY } from '../../../../headless/utils/processCleanupViewConstants'
import Alert from '../../../primitives/Alert'
import { Switch } from '../../../primitives/Switch'
import { chipPillStyle, chipPillTextStyle } from '../../chips/pillStyles'
import { nativeRadii, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

export interface ProcessCleanupCardProps {
  /** The run whose cleanup list this is — any run at its sign-off, top-level or nested. */
  runId: string
}

/**
 * What a run removes once its sign-off is approved: each item with why, switched
 * on to go, off to keep, and a switch to clean up nothing — and, once the
 * cleanup step ran, what it removed. Hidden while there is nothing to show.
 */
export default function ProcessCleanupCard({ runId }: ProcessCleanupCardProps) {
  const { theme, status } = useNativeTheme()
  const { list, loadError, actionError, busy, setItemSelected, setOff } = useProcessCleanup(runId)
  if (loadError) return <Alert variant="error">{PROCESS_CLEANUP_COPY.loadError}</Alert>
  if (!list || (list.items.length === 0 && !list.report)) return null
  const editable = processCleanupEditable(list)
  const rows = processCleanupRows(list)

  return (
    <View
      accessibilityLabel={PROCESS_CLEANUP_COPY.title}
      style={{
        gap: nativeSpace[3],
        padding: nativeSpace[4],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[4],
        backgroundColor: theme.surface.raised,
      }}
    >
      <View style={{ gap: nativeSpace[1] }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
          {PROCESS_CLEANUP_COPY.title}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {processCleanupHeadline(list)}
        </Text>
        {editable ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{PROCESS_CLEANUP_COPY.hint}</Text>
        ) : null}
      </View>
      {editable ? (
        <Switch
          checked={!list.off}
          onCheckedChange={(on) => void setOff(!on)}
          label={PROCESS_CLEANUP_COPY.switchLabel}
          disabled={busy}
        />
      ) : null}
      {actionError ? <Alert variant="error">{actionError}</Alert> : null}
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[3],
          overflow: 'hidden',
        }}
      >
        {rows.map((row, index) => (
          <View
            key={row.id}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: nativeSpace[3],
              padding: nativeSpace[3],
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: theme.border.subtle,
            }}
          >
            {editable ? (
              <Switch
                checked={row.selected && !list.off}
                onCheckedChange={(selected) => void setItemSelected(row.id, selected)}
                accessibilityLabel={PROCESS_CLEANUP_COPY.keepLabel(row.label)}
                disabled={busy || list.off}
              />
            ) : null}
            <View style={{ flex: 1, gap: nativeSpace[1] }}>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: nativeSpace[2],
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Courier', color: theme.text.primary }}>
                  {row.label}
                </Text>
                <View style={chipPillStyle(theme)}>
                  <Text style={chipPillTextStyle(theme)}>{row.kindLabel}</Text>
                </View>
                {row.outcome ? (
                  <View style={chipPillStyle(theme)}>
                    <Text style={chipPillTextStyle(theme)}>{row.outcome.label}</Text>
                  </View>
                ) : null}
              </View>
              {row.reason ? (
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>{row.reason}</Text>
              ) : null}
              {row.outcome?.detail ? (
                <Text style={{ fontSize: 12, color: status.stuck.softFg }}>
                  {row.outcome.detail}
                </Text>
              ) : null}
              {row.byLabel ? (
                <Text style={{ fontSize: 12, color: theme.text.muted }}>{row.byLabel}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
