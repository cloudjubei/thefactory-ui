import { Text, View } from 'react-native'
import { designAskSummary, useActiveProject, useDesignPreview } from '../../../headless'
import type { DesignIndex } from '../../../headless/api'
import type { DesignAskEntry } from '../../../headless/utils/toolAskCardTypes'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type DesignAskBoxProps = {
  /** The project the ask names; the chat's own when it names none. */
  projectId?: string
  entries: DesignAskEntry[]
  newScreens: Array<{ name: string; closest: string[]; why: string }>
}

function Pill({ tone, label }: { tone: 'review' | 'running'; label: string }) {
  const { status } = useNativeTheme()
  const t = status[tone]
  return (
    <View
      style={{
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 7,
        borderColor: t.softBorder,
        backgroundColor: t.softBg,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: t.softFg }}>{label}</Text>
    </View>
  )
}

/** Native peer of web's `DesignAskSummaryBox`: what a design ask files, against a design already read. */
export function DesignAskSummaryBox({
  index,
  entries,
  newScreens,
}: Omit<DesignAskBoxProps, 'projectId'> & { index: DesignIndex }) {
  const { theme, status } = useNativeTheme()
  const summary = designAskSummary(index, entries)
  const body = { fontSize: 12.5, color: theme.text.primary }
  const muted = { fontSize: 12.5, color: theme.text.secondary }
  return (
    <View
      style={{
        gap: 10,
        padding: 12,
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
      }}
    >
      {summary.screens.map((s) => (
        <View key={s.name} style={{ gap: 6 }}>
          <Text style={body}>
            {s.found
              ? `Found the screen you already have — “${s.name}” in ${s.found.app}. It holds ${s.found.versions} ${s.found.versions === 1 ? 'image' : 'images'}; these go in as its states, not a new screen.`
              : `A new screen — “${s.name}”.`}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {s.states.map((st) => (
              <View key={st.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Pill
                  tone={st.tag === 'replaces' ? 'review' : 'running'}
                  label={st.tag === 'replaces' ? 'Replaces' : 'New'}
                />
                <Text style={body}>{st.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      {summary.unfiled > 0 ? (
        <Text style={muted}>
          {summary.unfiled} {summary.unfiled === 1 ? 'image names' : 'images name'} no screen yet —
          you file {summary.unfiled === 1 ? 'it' : 'them'} in Proposals.
        </Text>
      ) : null}
      {summary.variants.length > 0 ? (
        <Text style={muted}>Variants, given once: {summary.variants.join(', ')}</Text>
      ) : null}
      {newScreens.map((n) => (
        <View
          key={n.name}
          style={{
            gap: 2,
            padding: 8,
            borderWidth: 1,
            borderRadius: nativeRadii[2],
            borderColor: status.on_hold.softBorder,
            backgroundColor: status.on_hold.softBg,
          }}
        >
          <Text style={[body, { fontWeight: '600' }]}>
            Why “{n.name}” is not{' '}
            {n.closest.map((c) => `“${c}”`).join(' or ') || 'an existing screen'}
          </Text>
          <Text style={muted}>{n.why}</Text>
        </View>
      ))}
    </View>
  )
}

/**
 * Native peer of web's `DesignAskBox`: the body of an agent's design ask on its
 * card — each screen it files into, found or new, the states it replaces or
 * adds, the variants once, and why a new screen is not one it resembles.
 */
export default function DesignAskBox({ projectId, entries, newScreens }: DesignAskBoxProps) {
  const active = useActiveProject().projectId ?? undefined
  const { index } = useDesignPreview(projectId ?? active)
  return <DesignAskSummaryBox index={index} entries={entries} newScreens={newScreens} />
}
