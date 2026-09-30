import { useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'

import {
  extractErrorMessage,
  PROCESS_INTEGRATION_RETRY,
  PROCESS_INTEGRATION_RETRY_HEAD,
  processIntegrationView,
  type ProcessIntegrationMode,
  type ProcessRun,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import IntegrationChooser from './IntegrationChooser'

export type IntegrationResultProps = {
  run: ProcessRun
  onRetry: (mode: ProcessIntegrationMode) => Promise<void>
}

/**
 * What bringing an approved story's work in came to, on the run: the merged
 * commit, the pull request (opened in the browser), or why it did not land —
 * with a retry, the same way or another. The native peer of the web
 * `IntegrationResult`.
 */
export default function IntegrationResult({ run, onRetry }: IntegrationResultProps) {
  const { theme, status } = useNativeTheme()
  const [choosing, setChoosing] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const view = processIntegrationView(run)
  if (!view || !run.workBranch) return null
  const workBranch = run.workBranch
  const variant = status[view.tone]
  const link = view.link

  const retry = (mode: ProcessIntegrationMode) => {
    setSending(true)
    setError(undefined)
    onRetry(mode)
      .then(() => setChoosing(false))
      .catch((err: unknown) =>
        setError(extractErrorMessage(err, 'The work could not be brought in.')),
      )
      .finally(() => setSending(false))
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        marginHorizontal: nativeSpace[4],
        marginBottom: nativeSpace[3],
        gap: nativeSpace[2],
        borderRadius: nativeRadii[3],
        padding: nativeSpace[3],
        backgroundColor: variant.softBg,
        borderWidth: 1,
        borderColor: variant.softBorder,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: variant.softFg }}>{view.title}</Text>
        {view.sha ? (
          <Text
            selectable
            style={{
              fontFamily: nativeFontFamilies.mono,
              fontSize: 11,
              color: theme.text.secondary,
              backgroundColor: theme.surface.muted,
              borderRadius: nativeRadii[1],
              paddingHorizontal: 6,
            }}
          >
            {view.sha}
          </Text>
        ) : null}
      </View>
      {view.detail ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.detail}</Text>
      ) : null}
      {link ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(link.url).catch(() => undefined)}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: theme.accent.primary,
              textDecorationLine: 'underline',
            }}
          >
            {`${link.label} ↗`}
          </Text>
        </Pressable>
      ) : null}
      {error ? <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{error}</Text> : null}
      {view.canRetry ? (
        choosing ? (
          <IntegrationChooser
            workBranch={workBranch}
            head={PROCESS_INTEGRATION_RETRY_HEAD}
            busy={sending}
            onChoose={retry}
            onCancel={() => setChoosing(false)}
          />
        ) : (
          <View style={{ flexDirection: 'row' }}>
            <Button size="sm" variant="primary" onPress={() => setChoosing(true)}>
              {PROCESS_INTEGRATION_RETRY}
            </Button>
          </View>
        )
      ) : null}
    </View>
  )
}
