import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { EVALUATION_LAUNCH_ASK } from '../../../headless/utils/evaluationLaunchAskViewConstants'
import type { EvaluationLaunchAskBodyView } from '../../../headless/utils/evaluationLaunchAskViewTypes'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type EvaluationLaunchAskBodyProps = {
  body: EvaluationLaunchAskBodyView
}

const MONO = { fontFamily: 'Menlo' }

function Box({ children, tone }: { children: ReactNode; tone?: 'danger' | 'muted' }) {
  const { theme, status } = useNativeTheme()
  return (
    <View
      style={{
        gap: 6,
        padding: 12,
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        borderColor: tone === 'danger' ? status.blocked.softBorder : theme.border.subtle,
        backgroundColor:
          tone === 'danger'
            ? status.blocked.softBg
            : tone === 'muted'
              ? theme.surface.muted
              : theme.surface.base,
      }}
    >
      {children}
    </View>
  )
}

/** Native peer of web's `EvaluationLaunchAskBody`. */
export default function EvaluationLaunchAskBody({ body }: EvaluationLaunchAskBodyProps) {
  const { theme, status } = useNativeTheme()
  const preview = body.preview
  const heading = {
    fontSize: 11.5,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    color: theme.text.muted,
  }
  const chip = [
    {
      fontSize: 12,
      color: theme.text.primary,
      borderWidth: 1,
      borderColor: theme.border.default,
      borderRadius: nativeRadii[1],
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    MONO,
  ]
  const warn = { fontSize: 12.5, color: status.stuck.softFg }
  return (
    <View style={{ gap: 8 }}>
      {preview?.mixedBuilds ? (
        <Box tone="danger">
          <Text
            accessibilityRole="alert"
            style={{
              fontSize: 12.5,
              fontWeight: '700',
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              color: status.blocked.softFg,
            }}
          >
            {preview.mixedBuilds.title}
          </Text>
          <Text style={{ fontSize: 12.5, color: theme.text.primary }}>
            {preview.mixedBuilds.detail}
          </Text>
        </Box>
      ) : null}

      <Box>
        <Text style={heading}>{EVALUATION_LAUNCH_ASK.settings}</Text>
        {body.settings.map((row) => (
          <View key={row.key} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Text style={{ width: 96, fontSize: 12.5, color: theme.text.secondary }}>
              {row.label}
            </Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
                {row.value}
              </Text>
              {row.detail ? (
                <Text style={{ fontSize: 12, color: theme.text.muted }}>{row.detail}</Text>
              ) : null}
              {row.capped ? (
                <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{row.capped}</Text>
              ) : null}
            </View>
            {row.source ? (
              <Text style={{ fontSize: 11.5, color: theme.text.muted }}>{row.source}</Text>
            ) : null}
          </View>
        ))}
        {body.matchActivityId ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
              {EVALUATION_LAUNCH_ASK.matched}
            </Text>
            <Text style={chip} numberOfLines={1}>
              {body.matchActivityId}
            </Text>
          </View>
        ) : null}
      </Box>

      {preview ? (
        <Box>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: preview.rewritesLedger ? status.blocked.softFg : theme.text.primary,
            }}
          >
            {preview.ledger}
          </Text>
          {preview.covered ? (
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: status.done.softFg }}>
              {preview.covered}
            </Text>
          ) : null}
          <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{preview.totals}</Text>
          {preview.capabilities.map((c) => (
            <View
              key={c.capability}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}
            >
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: theme.text.primary }}>
                {c.label}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.muted }}>{c.work}</Text>
            </View>
          ))}
          {preview.unavailable ? <Text style={warn}>{preview.unavailable}</Text> : null}
          {preview.unknownFocus ? <Text style={warn}>{preview.unknownFocus}</Text> : null}
          {preview.buildHeading && preview.builds.length > 0 ? (
            <View style={{ gap: 4 }}>
              <Text style={heading}>{preview.buildHeading}</Text>
              {preview.builds.map((b) => (
                <View
                  key={b.name}
                  style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
                >
                  <Text style={{ fontSize: 12.5, color: theme.text.primary }}>{b.name}</Text>
                  {b.at ? <Text style={chip}>{b.at}</Text> : null}
                  {b.dirty ? (
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: status.stuck.softFg }}>
                      {EVALUATION_LAUNCH_ASK.uncommitted}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
          {preview.error ? <Text style={warn}>{preview.error}</Text> : null}
        </Box>
      ) : body.previewUnavailable ? (
        <Box tone="muted">
          <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
            {body.previewUnavailable}
          </Text>
        </Box>
      ) : null}
    </View>
  )
}
