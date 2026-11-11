import { Linking, Text, View } from 'react-native'
import {
  processTryBuildLinkExpired,
  useProcessTryBuild,
  type ProcessTryBuildDisplay,
  type ProcessTryBuildTone,
} from '../../../../headless'
import { nativeRadii, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconDownload, IconMobile } from '../../../icons'
import { Button } from '../../../primitives/Button'

export interface ProcessTryBuildCardProps {
  /** The run at its sign-off whose phone build this is. */
  runId: string
}

export interface ProcessTryBuildPanelProps {
  display: ProcessTryBuildDisplay
  /** Open the download; reads fresh links first once they stopped working. */
  onDownload?: () => void
}

/**
 * Native peer of web's `ProcessTryBuildCard`: the run's phone build to download, what to check
 * and that it runs on the person's own test account. No QR here — this is the phone.
 */
export default function ProcessTryBuildCard({ runId }: ProcessTryBuildCardProps) {
  const { display, refresh } = useProcessTryBuild(runId)
  if (!display) return null
  const onDownload = () => {
    if (!processTryBuildLinkExpired(display.download, Date.now())) {
      if (display.download) void Linking.openURL(display.download.href)
      return
    }
    void refresh().then((next) => {
      if (next?.download) void Linking.openURL(next.download.href)
    })
  }
  return <ProcessTryBuildPanel display={display} onDownload={onDownload} />
}

/** The block itself, from its laid-out view — what the connected card and the showcase both draw. */
export function ProcessTryBuildPanel({ display, onDownload }: ProcessTryBuildPanelProps) {
  const { theme, status } = useNativeTheme()
  const tone: Record<ProcessTryBuildTone, string> = {
    working: status.working.softFg,
    done: status.done.softFg,
    stuck: status.stuck.softFg,
    muted: theme.text.secondary,
  }

  return (
    <View
      accessibilityLabel={display.title}
      style={{
        gap: nativeSpace[3],
        padding: nativeSpace[4],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[4],
        backgroundColor: theme.surface.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[2] }}>
        <IconMobile size={16} color={theme.text.secondary} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
            {display.title}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: tone[display.tone] }}>
            {display.headline}
          </Text>
          {display.detail ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>{display.detail}</Text>
          ) : null}
        </View>
      </View>

      {display.download ? (
        <View style={{ flexDirection: 'row' }}>
          <Button size="sm" onPress={onDownload}>
            <IconDownload size={14} color={theme.text.inverted} />
            {display.download.label}
          </Button>
        </View>
      ) : null}

      {display.checks.length > 0 ? (
        <View style={{ gap: nativeSpace[2] }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
            {display.stepsTitle}
          </Text>
          {display.checks.map((check) => (
            <View key={check.title} style={{ gap: 2 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
                {check.title}
              </Text>
              {check.openLine ? (
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>{check.openLine}</Text>
              ) : null}
              {check.steps.map((step, i) => (
                <Text key={`${i}-${step}`} style={{ fontSize: 12, color: theme.text.secondary }}>
                  {`${i + 1}. ${step}`}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {display.accountNote ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{display.accountNote}</Text>
      ) : null}
    </View>
  )
}
