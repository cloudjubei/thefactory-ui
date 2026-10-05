import { useEffect, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { projectNoteChipView } from '../../../headless'
import type { ProjectNoteSummary } from '../../../headless/api'
import { nativeFontFamilies, nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconDocument, IconKey } from '../../icons'
import Tooltip from '../../primitives/Tooltip'
import RichText from '../files/RichText'

export type ProjectNoteChipProps = {
  note: Pick<ProjectNoteSummary, 'label' | 'kind'> &
    Partial<Pick<ProjectNoteSummary, 'access' | 'description'>>
  /** Reads a plain note's text for the card; never called for a secret. */
  loadValue?: () => Promise<string>
}

/**
 * A stored project note, as a chip: its kind as an icon and its label. A long
 * press shows what it is for, who may read it and — for a plain note — its text.
 */
export default function ProjectNoteChip({ note, loadValue }: ProjectNoteChipProps) {
  const { theme } = useNativeTheme()
  const view = projectNoteChipView(note)
  const Glyph = view.kind === 'secret' ? IconKey : IconDocument
  return (
    <Tooltip
      content={
        <View style={{ gap: 6, maxWidth: 300 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Glyph size={13} color={theme.text.primary} />
            <Text
              numberOfLines={1}
              style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary, flexShrink: 1 }}
            >
              {view.label}
            </Text>
            <Text style={{ fontSize: 12, color: theme.text.muted }}>· {view.kindLabel}</Text>
          </View>
          {view.description ? (
            <RichText text={view.description} typedReferences textColor={theme.text.secondary} />
          ) : null}
          {view.accessLabel ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              <Text style={{ fontWeight: '600' }}>{view.accessLabel}</Text> — {view.accessHelp}
            </Text>
          ) : null}
          {view.showsValue && loadValue ? <NoteText load={loadValue} /> : null}
          {view.hiddenValue ? (
            <Text style={{ fontSize: 12, color: theme.text.muted }}>{view.hiddenValue}</Text>
          ) : null}
        </View>
      }
    >
      <View
        accessibilityLabel={`${view.kindLabel}: ${view.label}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: nativeRadii.round,
          borderWidth: 1,
          borderColor: theme.border.default,
          backgroundColor: theme.surface.base,
        }}
      >
        <Glyph size={11} color={theme.text.muted} />
        <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{view.label}</Text>
      </View>
    </Tooltip>
  )
}

function NoteText({ load }: { load: () => Promise<string> }) {
  const { theme } = useNativeTheme()
  const [text, setText] = useState<string | undefined>()
  const [failed, setFailed] = useState(false)
  const loadOnce = useRef(load)
  useEffect(() => {
    let live = true
    loadOnce
      .current()
      .then((value) => live && setText(value))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [])
  if (failed) {
    return (
      <Text style={{ fontSize: 12, color: theme.text.muted }}>The note could not be read.</Text>
    )
  }
  return (
    <ScrollView
      style={{ maxHeight: 200, borderRadius: nativeRadii[2], backgroundColor: theme.surface.muted }}
      contentContainerStyle={{ padding: 8 }}
    >
      {text === undefined ? (
        <Text
          style={{ fontFamily: nativeFontFamilies.mono, fontSize: 11, color: theme.text.secondary }}
        >
          Loading…
        </Text>
      ) : (
        <RichText text={text} typedReferences textColor={theme.text.secondary} />
      )}
    </ScrollView>
  )
}
