import type { RunCliCapabilityCheckResponse } from '../api/generated'

/** A capability battery's result card for one CLI. */
export type CliCapabilityCard = RunCliCapabilityCheckResponse

/** How a probe or case result is coloured. */
export type CliCapabilityTone = 'pass' | 'fail' | 'none'

/** One failing probe's case that says why. */
export interface CliCapabilityCaseView {
  key: string
  tone: 'pass' | 'fail'
  mark: string
  detail: string
}

/** One probe row of a capability card. */
export interface CliCapabilityProbeView {
  id: string
  tone: CliCapabilityTone
  status: string
  label: string
  detail: string
  /** Cases with a reason, listed only for a failed probe. */
  cases: CliCapabilityCaseView[]
}

/** A capability card as the settings form shows it. */
export interface CliCapabilityCardView {
  headline: string
  latency: string
  cost?: string
  finished?: string
  probes: CliCapabilityProbeView[]
}
