import { useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import type { CredentialHelp } from '../../../headless/utils/credentialCaptureTypes'
import { Button } from '../../primitives/Button'
import { IconChevronDown, IconChevronRight, IconExternalLink, IconInfo } from '../../icons'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface CredentialHelpPanelProps {
  help: CredentialHelp
}

/**
 * Native peer of web's `CredentialHelpPanel`: the page that issues the secret,
 * one tap away, and the steps to take there behind a toggle.
 */
export default function CredentialHelpPanel({ help }: CredentialHelpPanelProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        padding: nativeSpace[2],
        gap: nativeSpace[2],
      }}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}
      >
        <IconInfo size={14} color={theme.accent.primary} />
        <Text style={{ flex: 1, fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
          {help.title}
        </Text>
        {open ? (
          <IconChevronDown size={14} color={theme.text.secondary} />
        ) : (
          <IconChevronRight size={14} color={theme.text.secondary} />
        )}
      </Pressable>
      {help.link ? (
        <Button size="sm" variant="secondary" onPress={() => void Linking.openURL(help.link!.url)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[1] }}>
            <Text style={{ fontSize: 12, color: theme.text.primary }}>{help.link.label}</Text>
            <IconExternalLink size={12} color={theme.text.primary} />
          </View>
        </Button>
      ) : null}
      {open
        ? help.steps.map((step, i) => (
            <View key={step} style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>{i + 1}.</Text>
              <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>{step}</Text>
            </View>
          ))
        : null}
    </View>
  )
}
