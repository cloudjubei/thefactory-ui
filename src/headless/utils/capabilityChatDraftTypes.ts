import type {
  CheckEcosystem,
  ProjectChecksListing,
  ProjectPlatform,
  VerificationApproachOption,
} from '../api/generated'
import type { CheckMethodId, CheckMethodRow } from './checkMethodTypes'

/** The methods a project can be set up to provide — a check command, or a way to capture the app. */
export type CapabilityMethodId = Extract<
  CheckMethodId,
  'tests' | 'uitests' | 'types' | 'lint' | 'format' | 'build' | 'screens' | 'walkthrough'
>

/** How a capability gets into the project: a command the checks scan detects, or a capture of the running app. */
export type CapabilityKind = 'check' | 'ui-tests' | 'capture'

/** The missing capability a draft asks the agent to set up. */
export type CapabilityDraftTarget = Pick<CheckMethodRow, 'label' | 'detail'> & {
  id: CapabilityMethodId
}

/** What the draft is built from — every part optional, and left out of the draft when unknown. */
export type CapabilityDraftContext = {
  /** The project's checks scan: its ecosystem, detected checks and what it did not find. */
  projectChecks?: ProjectChecksListing
  /** The project's platform, as the verification plan read it. */
  platform?: ProjectPlatform
  /** The verification approaches with their availability on this host — what a capture needs. */
  approaches?: readonly VerificationApproachOption[]
  /** The draft goes to a run's own chat, which can add the work to the run before its sign-off. */
  inRun: boolean
}

/** Per ecosystem, a sentence or list for each capability method; absent when there is nothing factual to say. */
export type CapabilityEcosystemTable = Partial<
  Record<CheckEcosystem, Partial<Record<CapabilityMethodId, string>>>
>
