import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { VerifyAttemptView } from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronRight } from '../../icons'
import { ScreensTab } from '../chat/signoff'
import ProofBanner from './ProofBanner'
import ProofScreens from './ProofScreens'

export type OtherVerifyAttemptsProps = {
  /** "Earlier attempts (3)". */
  label: string
  attempts: readonly VerifyAttemptView[]
  onOpenPair: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
}

function Attempt({
  attempt,
  onOpenPair,
  onRequestImage,
}: {
  attempt: VerifyAttemptView
  onOpenPair: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
}) {
  const { theme, status } = useNativeTheme()
  const { evidence } = attempt
  return (
    <View
      style={{
        gap: 8,
        padding: 10,
        borderRadius: nativeRadii[1],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.overlay,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
          {attempt.title}
        </Text>
        <Text
          style={{ fontSize: 12, fontWeight: '500', color: status[attempt.status.tone].softFg }}
        >
          {attempt.status.label}
        </Text>
      </View>
      {attempt.notes.map((note) => (
        <View key={note.label} style={{ gap: 2 }}>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            <Text style={{ fontWeight: '500', color: theme.text.primary }}>{note.label}</Text>
            {note.reason ? ` — ${note.reason}` : ''}
          </Text>
          {note.details?.map((d) => (
            <Text key={d} style={{ fontSize: 12, color: theme.text.secondary }}>
              {`• ${d}`}
            </Text>
          ))}
        </View>
      ))}
      {evidence.proof ? (
        <>
          {evidence.proof.header ? <ProofBanner header={evidence.proof.header} /> : null}
          <ProofScreens view={evidence.proof} onOpen={onOpenPair} onRequestImage={onRequestImage} />
        </>
      ) : evidence.pairs.length > 0 ? (
        <ScreensTab
          pairs={evidence.pairs}
          onOpen={onOpenPair}
          capturedLabel={undefined}
          onRequestImage={onRequestImage}
          capturing={false}
        />
      ) : (
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>
          No screens were filed for this attempt.
        </Text>
      )}
    </View>
  )
}

/**
 * The verify attempts a section is NOT showing, folded away — the native peer of
 * the web `OtherVerifyAttempts`. Their captures load only once opened.
 */
export default function OtherVerifyAttempts({
  label,
  attempts,
  onOpenPair,
  onRequestImage,
}: OtherVerifyAttemptsProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  return (
    <View
      style={{
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <IconChevronRight size={14} color={theme.text.secondary} />
        </View>
        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
          {label}
        </Text>
      </Pressable>
      {open ? (
        <View
          style={{
            gap: 10,
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          {attempts.map((a) => (
            <Attempt
              key={a.key}
              attempt={a}
              onOpenPair={onOpenPair}
              onRequestImage={onRequestImage}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}
