import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { FeatureRequestBrief } from 'thefactory-tools/types'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { IconChevronRight } from '../icons/IconChevronRight'
import { IconWarningTriangle } from '../icons/IconWarningTriangle'
import RichText from './files/RichText'
import {
  featureRequestSections,
  featureRequestSummary,
} from '../../headless/utils/featureRequestView'
import type { FeatureRequestSectionView } from '../../headless/utils/featureRequestViewTypes'

export interface FeatureRequestBriefCardProps {
  brief: FeatureRequestBrief
  /** The asking project's name — the meta of "Where it came from". */
  fromLabel: string
  /** The line above the title: who asked, through which chat, and when. */
  provenance?: ReactNode
  /** Names of the projects that adopt the result, shown as chips under the summary. */
  adopterLabels?: string[]
  /** Accepting may leave the two projects waiting on each other. */
  cycleWarning?: string
  /** The decision, the work under way, or the refusal — under the sections. */
  footer?: ReactNode
}

/** One section's lines — numbered or bulleted, with a "By hand" tag where only a person can check. */
export function FeatureRequestSectionItems({ section }: { section: FeatureRequestSectionView }) {
  const { theme, status } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[2] }}>
      {section.items.map((item, i) => (
        <View
          key={`${section.id}-${i}`}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[3] }}
        >
          <View
            style={{
              minWidth: 20,
              height: 20,
              borderRadius: nativeRadii.round,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: section.numbered ? status.working.softBg : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: section.numbered ? status.working.softFg : theme.text.secondary,
              }}
            >
              {item.marker || '·'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <RichText text={item.text} />
          </View>
          {item.byHand ? (
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: status.blocked.softFg,
                backgroundColor: status.blocked.softBg,
                borderRadius: nativeRadii[2],
                paddingHorizontal: nativeSpace[2],
                paddingVertical: 2,
                overflow: 'hidden',
              }}
            >
              By hand
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}

function SectionRow({ section }: { section: FeatureRequestSectionView }) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: theme.border.subtle }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[3],
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
        }}
      >
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <IconChevronRight size={12} color={theme.text.secondary} />
        </View>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          {section.title}
        </Text>
        {section.meta ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{section.meta}</Text>
        ) : null}
      </Pressable>
      {open ? (
        <View
          style={{
            paddingLeft: nativeSpace[8],
            paddingRight: nativeSpace[4],
            paddingBottom: nativeSpace[4],
          }}
        >
          <FeatureRequestSectionItems section={section} />
        </View>
      ) : null}
    </View>
  )
}

/**
 * Native peer of web's `FeatureRequestBriefCard` — a cross-project request as one card: who asked,
 * title and summary, then each part it carries as a section opened on demand, and the footer the
 * host passes. Purely presentational.
 */
export default function FeatureRequestBriefCard({
  brief,
  fromLabel,
  provenance,
  adopterLabels,
  cycleWarning,
  footer,
}: FeatureRequestBriefCardProps) {
  const { theme, status } = useNativeTheme()
  const summary = featureRequestSummary(brief)
  const sections = featureRequestSections(brief, fromLabel)
  return (
    <View
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        overflow: 'hidden',
        borderRadius: nativeRadii[4],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View style={{ padding: nativeSpace[4], gap: nativeSpace[3] }}>
        {provenance}
        <Text
          style={{ fontSize: 17, fontWeight: '600', lineHeight: 23, color: theme.text.primary }}
        >
          {brief.title}
        </Text>
        {summary ? <RichText text={summary} textColor={theme.text.secondary} /> : null}
        {adopterLabels?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
            {adopterLabels.map((label) => (
              <Text
                key={label}
                style={{
                  fontSize: 12,
                  color: theme.text.primary,
                  borderWidth: 1,
                  borderColor: theme.border.subtle,
                  borderRadius: nativeRadii[3],
                  paddingHorizontal: nativeSpace[2],
                  paddingVertical: nativeSpace[1],
                }}
              >
                adopts {label}
              </Text>
            ))}
          </View>
        ) : null}
        {cycleWarning ? (
          <View
            style={{
              flexDirection: 'row',
              gap: nativeSpace[2],
              borderRadius: nativeRadii[3],
              backgroundColor: status.blocked.softBg,
              padding: nativeSpace[3],
            }}
          >
            <IconWarningTriangle size={16} color={status.blocked.softFg} />
            <Text style={{ flex: 1, fontSize: 12, color: status.blocked.softFg }}>
              {cycleWarning}
            </Text>
          </View>
        ) : null}
      </View>
      {sections.map((section) => (
        <SectionRow key={section.id} section={section} />
      ))}
      {footer ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.border.default,
            backgroundColor: theme.surface.base,
            padding: nativeSpace[4],
            gap: nativeSpace[3],
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  )
}
