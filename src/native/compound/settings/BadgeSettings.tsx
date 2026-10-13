import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useAppSettings } from '../../../headless/contexts/AppSettingsContext'
import { DEFAULT_APP_SETTINGS } from '../../../headless/types/settings'
import { inkBadgeLook, inkChannelColors } from '../../../headless/utils/inkBadge'
import {
  BADGE_CHANGE_COLOURS_LABEL,
  BADGE_CHANNEL_COLOURS_LABEL,
  BADGE_CHANNEL_SWATCHES,
  BADGE_DEFAULT_LABEL,
  BADGE_MODE_LEGEND,
  BADGE_MODE_OPTIONS,
  BADGE_MOTION_LEGEND,
  BADGE_MOTION_OPTIONS,
  BADGE_PREVIEW_LABEL,
  BADGE_PREVIEW_ROWS,
  BADGE_RESET_LABEL,
  BADGE_SAMPLE_IDLE,
  BADGE_SAMPLE_RUNNING,
  BADGE_SETTINGS_INTRO,
  BADGE_STYLE_LEGEND,
  BADGE_STYLE_OPTIONS,
} from '../../../headless/utils/inkBadgeConstants'
import type { InkBadgeLook, InkBadgeState } from '../../../headless/utils/inkBadgeTypes'
import { navRowIndicator, navRowTitle } from '../../../headless/utils/navIndicator'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import InkBadge from '../shell/InkBadge'
import NavIndicator from '../shell/NavIndicator'

const CARD_SCALE = 1.4

export interface BadgeSettingsProps {
  /** Opens Settings › Notifications, where the channel colours are picked. */
  onOpenNotifications?: () => void
}

type Option = {
  id: string
  label: string
  isDefault: boolean
  selected: boolean
  badge: InkBadgeState
  look: InkBadgeLook
  pick: () => void
}

/**
 * Settings › Visual › Badges on mobile — the peer of the web `BadgeSettings`:
 * the same three choices drawn live, the channel colours, a reset and a
 * preview of every row state.
 */
export default function BadgeSettings({ onOpenNotifications }: BadgeSettingsProps) {
  const { settings, setUserPreferences } = useAppSettings()
  const { theme } = useNativeTheme()
  const badgeColors = settings.notifications.badgeColors
  const look = inkBadgeLook(settings.userPreferences)
  const colors = useMemo(() => inkChannelColors(badgeColors), [badgeColors])
  const defaults = DEFAULT_APP_SETTINGS.userPreferences

  const groups: { legend: string; options: Option[] }[] = [
    {
      legend: BADGE_MODE_LEGEND,
      options: BADGE_MODE_OPTIONS.map((o) => ({
        id: o.id,
        label: o.label,
        isDefault: o.id === defaults.badgeMode,
        selected: o.id === look.mode,
        badge: BADGE_SAMPLE_IDLE,
        look: { ...look, mode: o.id },
        pick: () => setUserPreferences({ badgeMode: o.id }),
      })),
    },
  ]
  if (look.mode === 'total') {
    groups.push({
      legend: BADGE_STYLE_LEGEND,
      options: BADGE_STYLE_OPTIONS.map((o) => ({
        id: o.id,
        label: o.label,
        isDefault: o.id === defaults.badgeStyle,
        selected: o.id === look.style,
        badge: BADGE_SAMPLE_IDLE,
        look: { ...look, style: o.id },
        pick: () => setUserPreferences({ badgeStyle: o.id }),
      })),
    })
  }
  groups.push({
    legend: BADGE_MOTION_LEGEND,
    options: BADGE_MOTION_OPTIONS.map((o) => ({
      id: o.id,
      label: o.label,
      isDefault: o.id === defaults.badgeMotion,
      selected: o.id === look.motion,
      badge: BADGE_SAMPLE_RUNNING,
      look: { ...look, motion: o.id },
      pick: () => setUserPreferences({ badgeMotion: o.id }),
    })),
  })

  const preview = BADGE_PREVIEW_ROWS.map((row) => {
    const indicator = navRowIndicator({
      parts: row.parts,
      running: row.running,
      fresh: row.fresh ? [{ channel: 'activity', count: row.fresh }] : undefined,
      rollup: true,
    })
    return { label: row.label, indicator, title: navRowTitle(row.label, indicator) }
  })

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 18 }}>
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>{BADGE_SETTINGS_INTRO}</Text>
      {groups.map((g) => (
        <View key={g.legend} style={{ gap: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
            {g.legend}
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={g.legend}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
          >
            {g.options.map((o) => (
              <Pressable
                key={o.id}
                onPress={o.pick}
                accessibilityRole="radio"
                accessibilityLabel={o.label}
                accessibilityState={{ checked: o.selected }}
                style={{
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 104,
                  paddingHorizontal: 10,
                  paddingTop: 12,
                  paddingBottom: 10,
                  borderRadius: 10,
                  backgroundColor: theme.surface.raised,
                  borderWidth: o.selected ? 2 : 1,
                  borderColor: o.selected ? theme.accent.primary : theme.border.subtle,
                }}
              >
                <View style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <InkBadge
                    badge={o.badge}
                    look={o.look}
                    badgeColors={badgeColors}
                    scale={CARD_SCALE}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: o.selected ? '600' : '500',
                    color: theme.text.primary,
                  }}
                >
                  {o.label}
                </Text>
                {o.isDefault ? (
                  <Text style={{ fontSize: 10.5, color: theme.text.muted }}>
                    {BADGE_DEFAULT_LABEL}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {BADGE_CHANNEL_COLOURS_LABEL}
        </Text>
        {BADGE_CHANNEL_SWATCHES.map((s) => (
          <View key={s.channel} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: colors[s.channel].bg,
              }}
            />
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>{s.label}</Text>
          </View>
        ))}
        {onOpenNotifications ? (
          <Pressable onPress={onOpenNotifications} accessibilityRole="link" hitSlop={6}>
            <Text style={{ fontSize: 13, color: theme.accent.primary }}>
              {BADGE_CHANGE_COLOURS_LABEL}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ alignSelf: 'flex-start' }}>
        <Button
          variant="outline"
          size="sm"
          onPress={() =>
            setUserPreferences({
              badgeMode: defaults.badgeMode,
              badgeStyle: defaults.badgeStyle,
              badgeMotion: defaults.badgeMotion,
            })
          }
        >
          {BADGE_RESET_LABEL}
        </Button>
      </View>

      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: theme.text.muted,
          }}
        >
          {BADGE_PREVIEW_LABEL}
        </Text>
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.base,
            padding: 8,
          }}
        >
          {preview.map((r) => (
            <View
              key={r.label}
              accessible
              accessibilityLabel={r.title}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                minHeight: 40,
                paddingHorizontal: 10,
              }}
            >
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  backgroundColor: theme.border.strong,
                }}
              />
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: theme.text.primary }}>
                {r.label}
              </Text>
              <NavIndicator indicator={r.indicator} badgeColors={badgeColors} look={look} />
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
