import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import {
  cliImageBuildLog,
  cliImageBuildSteps,
  formatBuildElapsed,
} from '../../../headless/utils/cliImageView'
import { CLI_IMAGE_LOG_WAITING } from '../../../headless/utils/cliImageViewConstants'
import type { CliImageBuild } from '../../../headless/utils/cliImageViewTypes'
import Spinner from '../../primitives/Spinner'
import { IconCheck } from '../../icons/IconCheck'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

const LOG_STICK_THRESHOLD_PX = 24

export type CliImageBuildProgressProps = {
  cliName: string
  update: CliImageBuild
  output: string | undefined
}

/**
 * Native peer of web's `CliImageBuildProgress` — a sandbox-image rebuild's
 * current stage, running time and streamed docker output, kept scrolled to
 * the newest line unless the reader scrolls up.
 */
export function CliImageBuildProgress({ cliName, update, output }: CliImageBuildProgressProps) {
  const { theme, status } = useNativeTheme()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const steps = useMemo(() => cliImageBuildSteps(update.phase), [update.phase])
  const visibleLog = useMemo(
    () => cliImageBuildLog(output, update.logTail),
    [output, update.logTail],
  )

  const logRef = useRef<ScrollView>(null)
  const stickToBottomRef = useRef(true)

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        gap: nativeSpace[3],
        borderRadius: nativeRadii[1],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: theme.surface.muted,
        paddingHorizontal: nativeSpace[5],
        paddingVertical: nativeSpace[4],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: nativeSpace[3],
        }}
      >
        <Text style={{ flex: 1, fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
          Updating {cliName} to {update.targetVersion}
        </Text>
        <Text style={{ fontSize: 12, fontVariant: ['tabular-nums'], color: theme.text.secondary }}>
          {formatBuildElapsed(now - Date.parse(update.startedAt))}
        </Text>
      </View>

      <View style={{ gap: nativeSpace[2] }}>
        {steps.map((step) => (
          <View
            key={step.phase}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[3] }}
          >
            <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
              {step.state === 'done' ? (
                <IconCheck size={14} color={status.done.bg} />
              ) : step.state === 'active' ? (
                <Spinner size={12} />
              ) : (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.text.muted,
                    opacity: 0.5,
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: step.state === 'active' ? '500' : '400',
                  color:
                    step.state === 'active'
                      ? theme.text.primary
                      : step.state === 'done'
                        ? theme.text.secondary
                        : theme.text.muted,
                }}
              >
                {step.text}
              </Text>
              {step.state === 'active' ? (
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>{step.hint}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      <ScrollView
        ref={logRef}
        style={{
          height: 160,
          borderRadius: nativeRadii[1],
          backgroundColor: theme.surface.base,
        }}
        contentContainerStyle={{ padding: nativeSpace[3] }}
        nestedScrollEnabled
        scrollEventThrottle={64}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
          stickToBottomRef.current =
            contentSize.height - contentOffset.y - layoutMeasurement.height < LOG_STICK_THRESHOLD_PX
        }}
        onContentSizeChange={() => {
          if (stickToBottomRef.current) logRef.current?.scrollToEnd({ animated: false })
        }}
      >
        <Text style={{ fontFamily: 'Courier', fontSize: 11, color: theme.text.secondary }}>
          {visibleLog || CLI_IMAGE_LOG_WAITING}
        </Text>
      </ScrollView>
    </View>
  )
}

export default CliImageBuildProgress
