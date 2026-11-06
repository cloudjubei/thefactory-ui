import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { IconKey } from '../../icons'
import { CAPTURE_PURPOSE_LABEL } from '../../../headless/utils/credentialCaptureConstants'
import { captureCardTitle, captureStatusDisplay } from '../../../headless/utils/credentialCaptures'
import type { CredentialCapture } from '../../../headless/utils/credentialCaptureTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface CaptureCardShellProps {
  capture: CredentialCapture
  /** What the card asks of the person, under its heading. */
  children: ReactNode
}

/** Native peer of web's `CaptureCardShell`: a capture card's frame and heading. */
export default function CaptureCardShell({ capture, children }: CaptureCardShellProps) {
  const { theme, status: statusTokens } = useNativeTheme()
  const accent = statusTokens.working.bg
  const PAD = nativeSpace[4]

  return (
    <View
      style={{
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: accent,
        backgroundColor: theme.surface.overlay,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: nativeSpace[2],
          paddingHorizontal: PAD,
          paddingVertical: PAD,
        }}
      >
        <View style={{ paddingTop: 2 }}>
          <IconKey size={14} color={accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
            {captureCardTitle(capture)}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {CAPTURE_PURPOSE_LABEL}: {capture.purpose}
          </Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '500', color: accent }} numberOfLines={1}>
          {captureStatusDisplay(capture).label}
        </Text>
      </View>

      {children}
    </View>
  )
}
