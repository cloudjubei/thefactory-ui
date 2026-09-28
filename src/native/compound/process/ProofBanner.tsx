import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { VerifyProofDryLine, VerifyProofHeader } from '../../../headless'
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
 * A dry attempt as one quiet line under its header — the native peer of the web
 * `DryProofLine`. The whole line is the pressable row that folds the neutral
 * table of what was faked, and the builds it ran against, open in place.
 */
export function DryProofLine({ dry }: { dry: VerifyProofDryLine }) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(false)
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 8,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            marginTop: 6,
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: status.working.bg,
          }}
        />
        <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 18, color: theme.text.secondary }}>
          <Text style={{ fontWeight: '600', color: theme.text.primary }}>{dry.lead}</Text>
          {` ${dry.text} `}
          <Text style={{ fontSize: 12, fontWeight: '500', color: theme.accent.primary }}>
            {`${open ? dry.toggle.close : dry.toggle.open} ›`}
          </Text>
        </Text>
      </Pressable>
      {open ? (
        <View
          style={{
            overflow: 'hidden',
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
          }}
        >
          {dry.rows.map((row, i) => (
            <View
              key={row.label}
              style={{
                flexDirection: 'row',
                borderBottomWidth: i < dry.rows.length - 1 ? 1 : 0,
                borderBottomColor: theme.border.subtle,
              }}
            >
              <View
                style={{
                  width: 88,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  backgroundColor: theme.surface.raised,
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
                  {row.label}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  minWidth: 0,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  backgroundColor: theme.surface.base,
                }}
              >
                {row.kind === 'text' ? (
                  <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{row.text}</Text>
                ) : (
                  <View
                    style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}
                  >
                    {row.parts.map((part, j) =>
                      part.kind === 'sha' ? (
                        <RefChip key={`${j}:${part.sha}`} kind="commit" value={part.sha} />
                      ) : (
                        <Text
                          key={`${j}:${part.text}`}
                          style={{ fontSize: 12, color: theme.text.secondary }}
                        >
                          {part.text}
                        </Text>
                      ),
                    )}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function UnvouchedNote({ text }: { text: string }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
      <IconInfo size={14} color={theme.text.muted} />
      <Text style={{ flex: 1, fontSize: 12, color: theme.text.primary }}>{text}</Text>
    </View>
  )
}

/**
 * What data a verification ran on, said before anything else it shows — the
 * native peer of the web `ProofBanner`. A dry attempt is one quiet line whose
 * detail folds open; a live or unstated one keeps its banner. A proof the
 * backend can no longer vouch for any of says so.
 */
export default function ProofBanner({ header }: { header: VerifyProofHeader }) {
  const { theme, status } = useNativeTheme()
  if (header.dry) {
    return (
      <View style={{ gap: 6 }}>
        <DryProofLine dry={header.dry} />
        {header.unvouched ? <UnvouchedNote text={header.unvouched.text} /> : null}
      </View>
    )
  }
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
        {header.unvouched ? <UnvouchedNote text={header.unvouched.text} /> : null}
        <ProofBuildLine header={header} />
      </View>
    </View>
  )
}
