import { useMemo } from 'react'
import { DEFAULT_APP_SETTINGS } from '../../../headless/types/settings'
import { useAppSettings } from '../../../headless/contexts/AppSettingsContext'
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
  BADGE_SETTINGS_TITLE,
  BADGE_STYLE_LEGEND,
  BADGE_STYLE_OPTIONS,
} from '../../../headless/utils/inkBadgeConstants'
import type { InkBadgeLook, InkBadgeState } from '../../../headless/utils/inkBadgeTypes'
import { navRowIndicator, navRowTitle } from '../../../headless/utils/navIndicator'
import { Button } from '../../primitives/Button'
import InkBadge from '../shell/InkBadge'
import NavIndicator from '../shell/NavIndicator'

const CARD_SCALE = 1.4

export type BadgeSettingsProps = {
  /** Opens Settings › Notifications, where the channel colours are picked. */
  onOpenNotifications?: () => void
}

/**
 * Settings › Visual › Badges: how project and group rows add up what waits
 * on the person, how a one-total badge mixes its colours, and how a badge
 * shows that something runs — every option drawn live, with a preview of
 * every row state. The native `BadgeSettings` offers the same choices.
 */
export default function BadgeSettings({ onOpenNotifications }: BadgeSettingsProps) {
  const { settings, setUserPreferences } = useAppSettings()
  const badgeColors = settings.notifications.badgeColors
  const look = inkBadgeLook(settings.userPreferences)
  const colors = useMemo(() => inkChannelColors(badgeColors), [badgeColors])
  const defaults = DEFAULT_APP_SETTINGS.userPreferences

  const groups: {
    legend: string
    options: {
      id: string
      label: string
      isDefault: boolean
      selected: boolean
      badge: InkBadgeState
      look: InkBadgeLook
      pick: () => void
    }[]
  }[] = [
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
    <section className="max-w-4xl mt-10 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{BADGE_SETTINGS_TITLE}</h2>
        <p className="text-[13px] text-(--text-secondary)">{BADGE_SETTINGS_INTRO}</p>
      </div>
      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex-[999_1_420px] min-w-0 flex flex-col gap-5">
          {groups.map((g) => (
            <fieldset key={g.legend} className="min-w-0 border-0 p-0 m-0">
              <legend className="text-sm font-semibold mb-2.5 p-0">{g.legend}</legend>
              <div role="radiogroup" aria-label={g.legend} className="flex flex-wrap gap-2">
                {g.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={o.selected}
                    onClick={o.pick}
                    className={`flex flex-col items-center gap-2 min-w-28 px-2.5 pt-3 pb-2.5 rounded-[10px] bg-(--surface-raised) cursor-pointer focus:outline-none focus-visible:ring-2 ${
                      o.selected
                        ? 'border-2 border-(--accent-primary)'
                        : 'border border-(--border-subtle)'
                    }`}
                  >
                    <span className="h-10 inline-flex items-center justify-center">
                      <InkBadge
                        badge={o.badge}
                        look={o.look}
                        badgeColors={badgeColors}
                        scale={CARD_SCALE}
                      />
                    </span>
                    <span
                      className={`text-[12.5px] ${o.selected ? 'font-semibold' : 'font-medium'}`}
                    >
                      {o.label}
                    </span>
                    {o.isDefault && (
                      <span className="text-[10.5px] text-(--text-muted)">
                        {BADGE_DEFAULT_LABEL}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-(--text-secondary)">
            <span className="font-semibold text-(--text-primary)">
              {BADGE_CHANNEL_COLOURS_LABEL}
            </span>
            {BADGE_CHANNEL_SWATCHES.map((s) => (
              <span key={s.channel} className="inline-flex items-center gap-1">
                <span
                  aria-hidden
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ background: colors[s.channel].bg }}
                />
                {s.label}
              </span>
            ))}
            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="text-(--accent-primary) hover:underline"
              >
                {BADGE_CHANGE_COLOURS_LABEL}
              </button>
            )}
          </div>
          <div>
            <Button
              variant="outline"
              onClick={() =>
                setUserPreferences({
                  badgeMode: defaults.badgeMode,
                  badgeStyle: defaults.badgeStyle,
                  badgeMotion: defaults.badgeMotion,
                })
              }
            >
              {BADGE_RESET_LABEL}
            </Button>
          </div>
        </div>

        <div className="flex-[1_1_260px] max-w-75 min-w-0 flex flex-col gap-2">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-(--text-muted)">
            {BADGE_PREVIEW_LABEL}
          </div>
          <div className="flex flex-col gap-px rounded-xl border border-(--border-subtle) bg-(--surface-base) p-2">
            {preview.map((r) => (
              <div
                key={r.label}
                title={r.title}
                className="flex items-center gap-2 px-2.5 min-h-9 rounded-lg text-[13px]"
              >
                <span aria-hidden className="w-3.5 h-3.5 rounded shrink-0 bg-(--border-strong)" />
                <span className="flex-1 min-w-0 truncate">{r.label}</span>
                <NavIndicator indicator={r.indicator} badgeColors={badgeColors} look={look} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
