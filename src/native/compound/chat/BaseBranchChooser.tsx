import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type { ProcessBaseBranchOptions } from 'thefactory-tools/types'

import {
  BASE_BRANCH_ASKED_MISSING,
  BASE_BRANCH_CURRENT_TAG,
  BASE_BRANCH_FOLLOWS_OPEN_RUN,
  BASE_BRANCH_LABEL,
  BASE_BRANCH_NOTE,
  BASE_BRANCH_OTHERS_HEADING,
  baseBranchChoiceView,
  type BaseBranchRowView,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type BaseBranchChooserProps = {
  /** The branches the launch preview offers; nothing is shown without them. */
  options: ProcessBaseBranchOptions | undefined
  /** The branch the agent asked for. */
  asked?: string
  /** The person's pick so far. */
  picked: string | undefined
  /** The work joins, or builds on, a run's open work, which decides its branch: nothing to choose. */
  followsOpenRun?: boolean
  busy?: boolean
  onChoose: (branch: string) => void
}

/** The tallest the branch list grows in place before it scrolls. */
const LIST_MAX_HEIGHT = 280

/**
 * Native peer of [web's `BaseBranchChooser`](../../../web/compound/chat/BaseBranchChooser.tsx):
 * one chip naming the branch the work goes off; tapping it lists the project's
 * branches — `dev`, `main` and the current one first — in place under it.
 */
export default function BaseBranchChooser({
  options,
  asked,
  picked,
  followsOpenRun = false,
  busy = false,
  onChoose,
}: BaseBranchChooserProps) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const view = baseBranchChoiceView(options, asked, picked)

  if (!options || !view.picked) return null

  if (followsOpenRun) {
    return (
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        {BASE_BRANCH_FOLLOWS_OPEN_RUN}
      </Text>
    )
  }

  const branchRow = (row: BaseBranchRowView, i: number) => {
    const selected = row.name === view.picked
    return (
      <Pressable
        key={row.name}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        onPress={() => {
          onChoose(row.name)
          setOpen(false)
        }}
        style={{
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          borderTopWidth: i > 0 ? 1 : 0,
          borderTopColor: theme.border.subtle,
          backgroundColor: selected ? theme.surface.muted : theme.surface.raised,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            fontFamily: nativeFontFamilies.mono,
            fontSize: 13,
            color: theme.text.primary,
          }}
        >
          {row.name}
        </Text>
        {row.current ? (
          <Text
            style={{
              fontSize: 10,
              color: theme.text.secondary,
              borderWidth: 1,
              borderColor: theme.border.default,
              borderRadius: nativeRadii.round,
              paddingHorizontal: 6,
            }}
          >
            {BASE_BRANCH_CURRENT_TAG}
          </Text>
        ) : null}
      </Pressable>
    )
  }

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: busy }}
        accessibilityLabel={`${BASE_BRANCH_LABEL}: ${view.picked}`}
        disabled={busy}
        onPress={() => setOpen((v) => !v)}
        style={{
          alignSelf: 'flex-start',
          maxWidth: '100%',
          minHeight: 36,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          borderRadius: nativeRadii.round,
          borderWidth: 1,
          borderColor: theme.accent.primary,
          backgroundColor: theme.surface.raised,
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{BASE_BRANCH_LABEL}</Text>
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            fontFamily: nativeFontFamilies.mono,
            fontSize: 13,
            fontWeight: '500',
            color: theme.text.primary,
          }}
        >
          {view.picked}
        </Text>
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {view.askedMissing ? (
        <Text style={{ fontSize: 11.5, color: status.working.softFg }}>
          {BASE_BRANCH_ASKED_MISSING(view.askedMissing)}
        </Text>
      ) : null}
      {open ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={BASE_BRANCH_LABEL}
          style={{
            borderWidth: 1,
            borderColor: theme.border.default,
            borderRadius: nativeRadii[3],
            overflow: 'hidden',
          }}
        >
          <ScrollView nestedScrollEnabled style={{ maxHeight: LIST_MAX_HEIGHT }}>
            {view.usual.map(branchRow)}
            {view.others.length > 0 ? (
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: theme.text.muted,
                  paddingHorizontal: 12,
                  paddingTop: 10,
                  paddingBottom: 4,
                  borderTopWidth: 1,
                  borderTopColor: theme.border.subtle,
                }}
              >
                {BASE_BRANCH_OTHERS_HEADING}
              </Text>
            ) : null}
            {view.others.map(branchRow)}
          </ScrollView>
          <Text
            style={{
              fontSize: 10.5,
              color: theme.text.muted,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderTopWidth: 1,
              borderTopColor: theme.border.subtle,
            }}
          >
            {BASE_BRANCH_NOTE}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
