import { DESIGN_TEXT, designAppNav, designPreviewShown, type DesignShown } from '../../../headless'
import type { DesignIndex } from '../../../headless/api'
import DesignFileThumb from './DesignFileThumb'
import DesignPill from './DesignPill'

export type DesignCurrentOverviewProps = {
  index: DesignIndex
  appId: string
  srcOf: (shown: DesignShown) => string | undefined
  onSelectScreen: (screenId: string) => void
  onOpenProposals: () => void
}

/**
 * What an app looks like now: each screen's current look, and how many of its
 * cells have a proposal waiting. Nothing here changes until one is accepted.
 */
export default function DesignCurrentOverview({
  index,
  appId,
  srcOf,
  onSelectScreen,
  onOpenProposals,
}: DesignCurrentOverviewProps) {
  const nav = designAppNav(index, appId)
  if (!nav) return null
  const all = [...nav.screens, ...nav.componentGroups.flatMap((g) => g.components)]
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-(--text-secondary)">{DESIGN_TEXT.currentIntro}</p>
      {all.length === 0 ? (
        <p className="rounded-md border border-dashed border-(--border-default) px-3 py-8 text-center text-[13px] text-(--text-muted)">
          {DESIGN_TEXT.noScreen}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2 @5xl:grid-cols-3">
          {all.map((s) => {
            const shown = designPreviewShown(index, s.id)
            return (
              <div
                key={s.id}
                className="flex flex-col gap-2 rounded-lg border border-(--border-subtle) p-3"
                style={{ background: 'var(--surface-raised)' }}
              >
                <button
                  type="button"
                  className="flex items-baseline justify-between gap-2 text-left"
                  onClick={() => onSelectScreen(s.id)}
                >
                  <span className="text-[14px] font-semibold text-(--text-primary)">{s.name}</span>
                  <span className="text-[11.5px] text-(--text-muted)">
                    {s.states} {s.states === 1 ? 'state' : 'states'}
                  </span>
                </button>
                <button type="button" className="self-start" onClick={() => onSelectScreen(s.id)}>
                  {shown ? (
                    <DesignFileThumb shown={shown} src={srcOf(shown)} width={256} />
                  ) : (
                    <div
                      className="flex items-center justify-center rounded-md border border-dashed border-(--border-default) text-[12px] text-(--text-muted)"
                      style={{ width: 256, height: 192 }}
                    >
                      {DESIGN_TEXT.noStates}
                    </div>
                  )}
                </button>
                {s.waiting > 0 ? (
                  <button type="button" className="self-start" onClick={onOpenProposals}>
                    <DesignPill tone="review">{s.waiting} waiting →</DesignPill>
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
