import type {
  CliCapabilityCardView,
  CliCapabilityTone,
} from '../../../headless/utils/cliCapabilityCardTypes'

const PROBE_TONE_CLASSES: Record<CliCapabilityTone, string> = {
  pass: 'text-green-500',
  fail: 'text-red-500',
  none: 'text-(--text-secondary)',
}

export type CliCapabilityCardPanelProps = { view: CliCapabilityCardView }

/**
 * A capability battery's result card: passes out of applicable probes, the
 * median call, what it cost — a plan's share as `$?` with its plan beside it —
 * when it finished, and each probe with the cases a failed one explains. The
 * native peer is the native `CliCapabilityCardPanel`.
 */
export function CliCapabilityCardPanel({ view }: CliCapabilityCardPanelProps) {
  return (
    <div className="rounded border border-(--border-default) bg-(--surface-muted) px-2 py-2 text-xs flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-(--text-primary) font-medium">{view.headline}</span>
        <span className="text-(--text-secondary)">{view.latency}</span>
        {view.cost ? <span className="text-(--text-secondary)">{view.cost}</span> : null}
        {view.finished && <span className="text-(--text-secondary) ml-auto">{view.finished}</span>}
      </div>
      {view.probes.map((probe) => (
        <div key={probe.id} className="flex items-start gap-2">
          <span className={`${PROBE_TONE_CLASSES[probe.tone]} w-14 shrink-0`}>{probe.status}</span>
          <div className="grow flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <span className="text-(--text-primary) w-40 shrink-0">{probe.label}</span>
              <span className="text-(--text-secondary) grow">{probe.detail}</span>
            </div>
            {probe.cases.length > 0 && (
              <ul className="flex flex-col gap-0.5 pl-40">
                {probe.cases.map((probeCase) => (
                  <li
                    key={probeCase.key}
                    className="flex items-start gap-2 text-(--text-secondary)"
                  >
                    <span className={`${PROBE_TONE_CLASSES[probeCase.tone]} shrink-0`}>
                      {probeCase.mark}
                    </span>
                    <span>{probeCase.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
