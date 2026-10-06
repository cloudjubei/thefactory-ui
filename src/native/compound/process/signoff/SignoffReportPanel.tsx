import { Pressable, Text, View } from 'react-native'

import type { ReviewTabId, SignoffReportView } from '../../../../headless'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import Markdown from '../../Markdown'
import NeedsYouSection from './NeedsYouSection'
import Pill from './Pill'
import ReportTiles from './ReportTiles'
import SignoffSection from './SignoffSection'
import { reviewToneVariant } from './tones'

export type SignoffReportPanelProps = {
  view: SignoffReportView
  onOpenTab?: (tab: ReviewTabId) => void
  hideTiles?: boolean
}

/**
 * Native peer of web's `SignoffReportPanel`: four tiles over Outcome, How it
 * was proven (each line linked to the tab with its proof), Decisions made and
 * Needs you — or the markdown, when the report cannot be read as sections.
 */
export default function SignoffReportPanel({
  view,
  onOpenTab,
  hideTiles,
}: SignoffReportPanelProps) {
  const { theme, status } = useNativeTheme()
  const body = { fontSize: 13, color: theme.text.secondary } as const
  const tone = (t: Parameters<typeof reviewToneVariant>[0]) =>
    t === 'neutral' ? theme.text.primary : reviewToneVariant(t, status).softFg
  const list = (items: readonly string[], empty: string) =>
    items.length > 0 ? (
      <View style={{ gap: 6 }}>
        {items.map((d) => (
          <View key={d} style={{ flexDirection: 'row', gap: 6 }}>
            <Text style={body}>•</Text>
            <View style={{ flex: 1 }}>
              <Markdown text={d} inline textStyle={body} />
            </View>
          </View>
        ))}
      </View>
    ) : (
      <Text style={body}>{empty}</Text>
    )

  return (
    <View>
      {hideTiles ? null : <ReportTiles tiles={view.tiles} />}

      {view.outcome ? (
        <SignoffSection title={view.outcome.title} summary={view.outcome.summary} defaultOpen>
          <Markdown
            text={view.outcome.body.detail ?? view.outcome.body.headline}
            textStyle={body}
          />
        </SignoffSection>
      ) : null}

      {view.howProven ? (
        <SignoffSection title={view.howProven.title} summary={view.howProven.summary} defaultOpen>
          <View style={{ gap: 6 }}>
            {view.howProven.body.map((row) => (
              <View key={row.key} style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontWeight: '700', color: tone(row.tone) }}>{row.mark}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Markdown text={row.text} inline textStyle={body} />
                  {row.tab && row.tabLabel && onOpenTab ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onOpenTab(row.tab!)}
                      style={{ alignSelf: 'flex-start' }}
                    >
                      <Pill tone="review" label={row.tabLabel} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </SignoffSection>
      ) : null}

      {view.decisions ? (
        <SignoffSection title={view.decisions.title} summary={view.decisions.summary}>
          {list(view.decisions.body, 'No decisions were recorded.')}
        </SignoffSection>
      ) : null}

      {view.needsYou ? <NeedsYouSection section={view.needsYou} /> : null}

      {view.fallbackMarkdown ? (
        <View style={{ borderTopWidth: 1, borderTopColor: theme.border.subtle, paddingTop: 12 }}>
          <Markdown text={view.fallbackMarkdown} />
        </View>
      ) : null}
    </View>
  )
}
