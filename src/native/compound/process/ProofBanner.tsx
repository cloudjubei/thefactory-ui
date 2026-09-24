import { Text, View } from 'react-native'

import type { VerifyProofHeader } from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCheckCircle, IconExclamation, IconInfo } from '../../icons'
import RefChip from '../chips/RefChip'

const ICON: Record<VerifyProofHeader['mode'], typeof IconInfo> = {
  live: IconCheckCircle,
  dry: IconExclamation,
  unknown: IconInfo,
}

/** Which builds every pair had to come from, worded as the requirement — the native peer of the web `ProofBuildLine`. */
export function ProofBuildLine({ header }: { header: VerifyProofHeader }) {
  const { theme } = useNativeTheme()
  if (!header.baseSha && !header.headSha) return null
  const word = { fontSize: 11.5, color: theme.text.secondary }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {header.baseSha ? (
        <>
          <Text style={word}>Befores must be built from the base</Text>
          <RefChip kind="commit" value={header.baseSha} />
        </>
      ) : null}
      {header.seams.length > 0 ? (
        <>
          <Text style={word}>with test seam</Text>
          {header.seams.map((s) => (
            <RefChip key={s} kind="commit" value={s} />
          ))}
        </>
      ) : null}
      {header.headSha ? (
        <>
          <Text style={word}>
            {header.baseSha ? '· afters from the branch' : 'Afters must be built from the branch'}
          </Text>
          <RefChip kind="commit" value={header.headSha} />
        </>
      ) : null}
    </View>
  )
}

/**
 * What data a verification ran on, said before anything else it shows — the
 * native peer of the web `ProofBanner`. A dry pass spells out what was faked and
 * what the live backend must send, so the reader knows what is still unverified.
 */
export default function ProofBanner({ header }: { header: VerifyProofHeader }) {
  const { theme, status } = useNativeTheme()
  const tone = status[header.tone]
  const titleColor = header.tone === 'empty' ? theme.text.primary : tone.softFg
  const Icon = ICON[header.mode]
  return (
    <View
      accessibilityRole="summary"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: tone.softBorder,
        backgroundColor: tone.softBg,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Icon size={16} color={titleColor} />
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: titleColor }}>{header.title}</Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{header.detail}</Text>
        {header.faked ? (
          <View
            style={{
              gap: 2,
              borderRadius: nativeRadii[1],
              borderWidth: 1,
              borderColor: theme.border.subtle,
              backgroundColor: theme.surface.base,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: theme.text.muted,
              }}
            >
              {header.faked.label}
            </Text>
            <Text style={{ fontSize: 12.5, color: theme.text.primary }}>{header.faked.text}</Text>
          </View>
        ) : null}
        {header.todo ? (
          <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
            {header.todo}
          </Text>
        ) : null}
        <ProofBuildLine header={header} />
      </View>
    </View>
  )
}
