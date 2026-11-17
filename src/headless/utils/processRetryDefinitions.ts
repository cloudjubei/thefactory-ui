import type { ProcessParkChoice } from 'thefactory-tools/types'

import {
  PROCESS_RETRY_DEFINITIONS_CURRENT,
  PROCESS_RETRY_DEFINITIONS_FROZEN,
  PROCESS_RETRY_DEFINITIONS_HEADING,
} from './processRetryDefinitionsConstants'
import type {
  ProcessRetryDefinitionChoice,
  ProcessRetryDefinitionRef,
  ProcessRetryDefinitionsOffer,
  ProcessRetryDefinitionsView,
} from './processRetryDefinitionsTypes'
import type { ProcessRetryPick } from './processTurnLimitViewTypes'

/**
 * What a retry of a stopped step runs, as thefactory-tools will say it on the
 * park choice — the versions frozen with the run, and the current ones when
 * newer. The resume option of the same name is how choosing current is asked.
 */
declare module 'thefactory-tools/types' {
  interface ProcessParkChoice {
    definitions?: ProcessRetryDefinitionsOffer
  }
  interface ProcessResumeOptions {
    /**
     * With `retry`: run the current definitions of the step's agent type and
     * process. Omitted: the versions frozen with this run.
     */
    useCurrentDefinitions?: boolean
  }
}

function isRef(value: unknown): value is ProcessRetryDefinitionRef {
  if (typeof value !== 'object' || value === null) return false
  const ref = value as ProcessRetryDefinitionRef
  return (
    (ref.kind === 'agent-type' || ref.kind === 'process') &&
    typeof ref.id === 'string' &&
    ref.id.length > 0 &&
    typeof ref.name === 'string' &&
    ref.name.length > 0 &&
    typeof ref.version === 'number' &&
    Number.isInteger(ref.version) &&
    ref.version >= 1
  )
}

function refsOf(value: unknown): ProcessRetryDefinitionRef[] | undefined {
  if (!Array.isArray(value) || !value.every(isRef)) return undefined
  return value
}

/** The versions on a retry choice, when they name something the card can show. Pure. */
export function processRetryDefinitionsOf(
  choice: Pick<ProcessParkChoice, 'definitions'>,
): ProcessRetryDefinitionsOffer | undefined {
  const offer = choice.definitions
  if (!offer) return undefined
  const frozen = refsOf(offer.frozen)
  if (!frozen || frozen.length === 0) return undefined
  if (offer.current === undefined) return { frozen }
  const current = refsOf(offer.current)
  if (!current) return undefined
  return current.length > 0 ? { frozen, current } : { frozen }
}

/** Whether the card offers the current definitions as well as this run's. Pure. */
export function processRetryDefinitionsOffered(
  offer: ProcessRetryDefinitionsOffer | undefined,
): boolean {
  return !!offer?.current && offer.current.length > 0 && offer.frozen.length > 0
}

function lineOf(refs: readonly ProcessRetryDefinitionRef[]): string {
  return refs.map((ref) => `${ref.name}, version ${ref.version}`).join(' · ')
}

/**
 * The version block of a retry card. One line when the retry runs this run's
 * versions; both lines when a newer definition is offered. Pure.
 */
export function processRetryDefinitionsView(
  offer: ProcessRetryDefinitionsOffer,
): ProcessRetryDefinitionsView | undefined {
  const read = processRetryDefinitionsOf({ definitions: offer })
  if (!read) return undefined
  if (!processRetryDefinitionsOffered(read)) {
    return { heading: PROCESS_RETRY_DEFINITIONS_HEADING, runs: lineOf(read.frozen) }
  }
  return {
    heading: PROCESS_RETRY_DEFINITIONS_HEADING,
    frozenLabel: PROCESS_RETRY_DEFINITIONS_FROZEN,
    currentLabel: PROCESS_RETRY_DEFINITIONS_CURRENT,
    frozenLine: lineOf(read.frozen),
    currentLine: lineOf(read.current ?? []),
  }
}

/** What a retry starts from for its definitions: this run's, when a newer one is offered. Pure. */
export function processRetryDefinitionChoiceStart(
  choice: Pick<ProcessParkChoice, 'definitions'>,
): ProcessRetryDefinitionChoice | undefined {
  return processRetryDefinitionsOffered(processRetryDefinitionsOf(choice)) ? 'frozen' : undefined
}

/**
 * The resume field for the definitions a person picked. Current asks the run
 * to use the newer ones; this run's versions are the default and send nothing.
 * Pure.
 */
export function processRetryUseCurrentDefinitions(
  pick: Pick<ProcessRetryPick, 'definitions'> | undefined,
): boolean {
  return pick?.definitions === 'current'
}
