import { probeCostLabel } from './costDetails'
import {
  CLI_CAPABILITY_CASE_MARKS,
  CLI_CAPABILITY_STATUS_LABELS,
} from './cliCapabilityCardConstants'
import type {
  CliCapabilityCard,
  CliCapabilityCardView,
  CliCapabilityTone,
} from './cliCapabilityCardTypes'

const toneOf = (status: string): CliCapabilityTone =>
  status === 'pass' ? 'pass' : status === 'fail' ? 'fail' : 'none'

/**
 * A capability battery's card as the CLI settings form shows it: passes out
 * of applicable probes, the median call in seconds, its cost and finish time
 * when known, and each probe's result — with the explained cases listed under
 * a failed probe. Pure.
 */
export function cliCapabilityCardView(card: CliCapabilityCard): CliCapabilityCardView {
  const cost = probeCostLabel(card)
  return {
    headline: `${card.passed}/${card.applicable} probes passed`,
    latency: `median call ${Math.round(card.p50LatencyMs / 100) / 10}s`,
    ...(cost ? { cost } : {}),
    ...(card.finishedAt ? { finished: new Date(card.finishedAt).toLocaleString() } : {}),
    probes: card.probes.map((probe) => {
      const tone = toneOf(probe.status)
      return {
        id: probe.id,
        tone,
        status: CLI_CAPABILITY_STATUS_LABELS[tone],
        label: probe.label,
        detail: probe.detail,
        cases:
          tone === 'fail'
            ? probe.cases.flatMap((probeCase) => {
                if (!probeCase.detail) return []
                const caseTone = probeCase.status === 'pass' ? 'pass' : 'fail'
                return [
                  {
                    key: probeCase.input,
                    tone: caseTone,
                    mark: CLI_CAPABILITY_CASE_MARKS[caseTone],
                    detail: probeCase.detail,
                  },
                ]
              })
            : [],
      }
    }),
  }
}
