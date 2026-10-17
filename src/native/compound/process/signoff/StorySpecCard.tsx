import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'

import {
  SIGNOFF_SPEC_CRITERIA_CAPTION,
  SIGNOFF_SPEC_CRITERIA_CHIP,
  SIGNOFF_SPEC_DESCRIPTION_LINES,
  SIGNOFF_SPEC_DESCRIPTION_TOGGLE,
  signoffSpecCriteria,
} from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconChecklist, IconChevronDown } from '../../../icons'
import Markdown from '../../Markdown'
import DependencyRef from '../../stories/DependencyRef'

export type StorySpecCardProps = {
  projectId: string
  storyId: string
  title: string
  description: string | undefined
  features: readonly { id: string; title: string; acceptance?: string }[]
  onOpenStory?: () => void
}

const FONT_SIZE = 13
const LINE_HEIGHT = 19.5
const FADE_HEIGHT = 28

/**
 * Native peer of web's `StorySpecCard`: the story's chip and title, a
 * checklist chip that opens each feature's acceptance criteria under its own
 * chip, and the description as markdown — clamped at three lines with a fade
 * and a small chevron under it only when its measured height is more.
 */
export default function StorySpecCard({
  projectId,
  storyId,
  title,
  description,
  features,
  onOpenStory,
}: StorySpecCardProps) {
  const { theme } = useNativeTheme()
  const [expanded, setExpanded] = useState(false)
  const [criteriaOpen, setCriteriaOpen] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const groups = useMemo(
    () =>
      signoffSpecCriteria(
        storyId,
        features.map((f) => ({ id: f.id, title: f.title, acceptance: f.acceptance })),
      ),
    [storyId, features],
  )
  const text = description?.trim()
  const maxHeight = SIGNOFF_SPEC_DESCRIPTION_LINES * LINE_HEIGHT
  const overflows = contentHeight > maxHeight + 1
  const clamped = overflows && !expanded
  const toggleLabel = expanded
    ? SIGNOFF_SPEC_DESCRIPTION_TOGGLE.less
    : SIGNOFF_SPEC_DESCRIPTION_TOGGLE.more

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <DependencyRef dependency={storyId} projectId={projectId} />
        <Pressable
          accessibilityRole="link"
          disabled={!onOpenStory}
          onPress={onOpenStory}
          style={{ flex: 1, minWidth: 140 }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
            {title}
          </Text>
        </Pressable>
        {groups.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: criteriaOpen }}
            accessibilityLabel={SIGNOFF_SPEC_CRITERIA_CHIP}
            onPress={() => setCriteriaOpen((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              height: 26,
              paddingHorizontal: 10,
              borderRadius: nativeRadii.round,
              borderWidth: 1,
              borderColor: criteriaOpen ? theme.accent.primary : theme.border.subtle,
              backgroundColor: criteriaOpen ? theme.accent.softBg : theme.surface.raised,
            }}
          >
            <IconChecklist
              size={13}
              color={criteriaOpen ? theme.accent.primary : theme.text.secondary}
            />
            <Text
              style={{
                fontSize: 12,
                color: criteriaOpen ? theme.accent.primary : theme.text.secondary,
              }}
            >
              {SIGNOFF_SPEC_CRITERIA_CHIP}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {text ? (
        <View style={{ maxHeight: expanded ? undefined : maxHeight, overflow: 'hidden' }}>
          <View onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}>
            <Markdown
              text={text}
              textStyle={{
                fontSize: FONT_SIZE,
                lineHeight: LINE_HEIGHT,
                color: theme.text.secondary,
              }}
            />
          </View>
          {clamped ? (
            <Svg
              pointerEvents="none"
              width="100%"
              height={FADE_HEIGHT}
              style={{ position: 'absolute', left: 0, right: 0, top: maxHeight - FADE_HEIGHT }}
            >
              <Defs>
                <LinearGradient id="specFade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.surface.raised} stopOpacity="0" />
                  <Stop offset="1" stopColor={theme.surface.raised} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height={FADE_HEIGHT} fill="url(#specFade)" />
            </Svg>
          ) : null}
        </View>
      ) : null}

      {text && overflows ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={toggleLabel}
          onPress={() => setExpanded((v) => !v)}
          style={{
            alignSelf: 'center',
            width: 36,
            height: 22,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: nativeRadii.round,
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
          }}
        >
          <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
            <IconChevronDown size={14} color={theme.text.secondary} />
          </View>
        </Pressable>
      ) : null}

      {criteriaOpen
        ? groups.map((group) => (
            <View
              key={group.key}
              style={{
                gap: 6,
                padding: 10,
                borderRadius: nativeRadii[3],
                borderWidth: 1,
                borderColor: theme.border.subtle,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <DependencyRef dependency={group.dependency} projectId={projectId} />
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                  {SIGNOFF_SPEC_CRITERIA_CAPTION}
                </Text>
              </View>
              {group.criteria.map((c, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
                  <Text style={{ fontSize: 13, color: theme.text.secondary }}>•</Text>
                  <View style={{ flex: 1 }}>
                    <Markdown
                      text={c}
                      inline
                      textStyle={{ fontSize: 13, color: theme.text.primary }}
                    />
                  </View>
                </View>
              ))}
            </View>
          ))
        : null}
    </View>
  )
}
