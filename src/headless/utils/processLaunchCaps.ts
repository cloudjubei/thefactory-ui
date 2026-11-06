import type { ProjectProcessDefaultCaps } from 'thefactory-tools/types'

import {
  LAUNCH_CAP_LABELS,
  LAUNCH_CAP_MINUTE_MS,
  LAUNCH_CAPS_COPY,
  LAUNCH_WORST_CASE_THINGS,
} from './processLaunchCapsConstants'
import type {
  LaunchCapFieldsInput,
  LaunchCapFieldView,
  LaunchCapKey,
  LaunchCaps,
  LaunchCapsTyped,
  LaunchWorstCaseInput,
} from './processLaunchCapsTypes'

const LAUNCH_CAP_KEYS: readonly LaunchCapKey[] = [
  'spendCapUsd',
  'wallClockMs',
  'maxIterations',
  'questionCap',
  'checkTimeoutMs',
]

const PROJECT_CAP_KEYS: readonly LaunchCapKey[] = ['spendCapUsd', 'wallClockMs', 'maxIterations']

const isPositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
const isWhole = (value: unknown): value is number =>
  isPositive(value) && Number.isSafeInteger(value)
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

/** Each cap's check on what it stores, and its reason in the field's words. */
const CAP_RULES: Record<LaunchCapKey, { valid: (value: unknown) => boolean; error: string }> = {
  spendCapUsd: { valid: isPositive, error: LAUNCH_CAPS_COPY.invalidAmount },
  wallClockMs: { valid: isWhole, error: LAUNCH_CAPS_COPY.invalidMinutes },
  maxIterations: { valid: isWhole, error: LAUNCH_CAPS_COPY.invalidWhole },
  questionCap: { valid: isCount, error: LAUNCH_CAPS_COPY.invalidCount },
  checkTimeoutMs: { valid: isWhole, error: LAUNCH_CAPS_COPY.invalidMinutes },
}

const inMinutes = (key: LaunchCapKey): boolean => key === 'wallClockMs' || key === 'checkTimeoutMs'

function textOf(key: LaunchCapKey, stored: number | undefined): string {
  if (stored === undefined) return ''
  return String(inMinutes(key) ? stored / LAUNCH_CAP_MINUTE_MS : stored)
}

function storedOf(key: LaunchCapKey, text: string): number | undefined {
  const typed = text.trim()
  if (typed === '') return undefined
  const value = Number(typed)
  return inMinutes(key) ? Math.round(value * LAUNCH_CAP_MINUTE_MS) : value
}

function defaultOf(
  key: LaunchCapKey,
  defaults: ProjectProcessDefaultCaps | undefined,
): number | undefined {
  if (key === 'spendCapUsd') return defaults?.spendUsdCap
  if (key === 'wallClockMs') return defaults?.wallClockMs
  return key === 'maxIterations' ? defaults?.maxIterations : undefined
}

/** The caps an agent's ask names that can be caps, as the backend reads them. Pure. */
export function launchCapsOfArgs(args: Readonly<Record<string, unknown>>): LaunchCaps {
  const caps: LaunchCaps = {}
  for (const key of LAUNCH_CAP_KEYS) {
    const value = args[key]
    if (CAP_RULES[key].valid(value)) caps[key] = value as number
  }
  return caps
}

function fieldOf(
  key: LaunchCapKey,
  start: number | undefined,
  typed: string | undefined,
  placeholder: string | undefined,
  startedFromProject: boolean,
): LaunchCapFieldView {
  const text = typed ?? textOf(key, start)
  const stored = storedOf(key, text)
  return {
    key,
    ...LAUNCH_CAP_LABELS[key],
    text,
    ...(text.trim() === '' && placeholder ? { placeholder } : {}),
    fromProject: startedFromProject && typed === undefined,
    ...(stored !== undefined && !CAP_RULES[key].valid(stored)
      ? { error: CAP_RULES[key].error }
      : {}),
  }
}

/** A launch card's limits: what the person typed, else the agent's ask, else the project's default. Pure. */
export function launchCapFields({
  asked = {},
  defaults,
  typed = {},
}: LaunchCapFieldsInput): LaunchCapFieldView[] {
  return LAUNCH_CAP_KEYS.map((key) => {
    const fallback = defaultOf(key, defaults)
    const askedValue = asked[key]
    const placeholder =
      askedValue !== undefined
        ? LAUNCH_CAPS_COPY.agentAsked(textOf(key, askedValue))
        : fallback !== undefined
          ? LAUNCH_CAPS_COPY.projectDefault(textOf(key, fallback))
          : undefined
    return fieldOf(
      key,
      askedValue ?? fallback,
      typed[key],
      placeholder,
      askedValue === undefined && fallback !== undefined,
    )
  })
}

function capsOf(fields: readonly LaunchCapFieldView[]): LaunchCaps {
  const caps: LaunchCaps = {}
  for (const field of fields) {
    if (field.error) continue
    const stored = storedOf(field.key, field.text)
    if (stored !== undefined) caps[field.key] = stored
  }
  return caps
}

/** The caps a card sends with its approval: an empty field names none. Pure. */
export function launchCapsMetadata(fields: readonly LaunchCapFieldView[]): LaunchCaps {
  return capsOf(fields)
}

/** Whether every field can be sent. Pure. */
export function launchCapsValid(fields: readonly LaunchCapFieldView[]): boolean {
  return fields.every((field) => !field.error)
}

function durationLabel(ms: number): string {
  const minutes = Math.round(ms / LAUNCH_CAP_MINUTE_MS)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${minutes}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

const counted = (count: number, one: string): string => `${count} ${one}${count === 1 ? '' : 's'}`

/** The limits set, in short: the line the folded section reads. Pure. */
export function launchCapsSummary(caps: LaunchCaps): string {
  const { spendCapUsd, wallClockMs, maxIterations, questionCap, checkTimeoutMs } = caps
  const parts = [
    spendCapUsd !== undefined ? `$${spendCapUsd}` : undefined,
    wallClockMs !== undefined ? durationLabel(wallClockMs) : undefined,
    maxIterations !== undefined ? counted(maxIterations, 'attempt') : undefined,
    questionCap === 0
      ? LAUNCH_CAPS_COPY.noQuestions
      : questionCap !== undefined
        ? counted(questionCap, 'question')
        : undefined,
    checkTimeoutMs !== undefined ? `${durationLabel(checkTimeoutMs)} a check` : undefined,
  ].filter((part) => part !== undefined)
  return parts.length > 0 ? parts.join(' · ') : LAUNCH_CAPS_COPY.noLimits
}

/** The most attempts a launch can make: its limit across what it works. Nothing without either. Pure. */
export function launchWorstCaseLine({
  attempts,
  count,
  of,
}: LaunchWorstCaseInput): string | undefined {
  if (attempts === undefined || count <= 0) return undefined
  return LAUNCH_CAPS_COPY.worstCase(
    counted(attempts, 'attempt'),
    counted(count, LAUNCH_WORST_CASE_THINGS[of]),
    counted(attempts * count, 'attempt'),
  )
}

/** The default caps a project's metadata holds. It is free JSON, so only real caps count. Pure. */
export function readProcessDefaultCaps(stored: unknown): ProjectProcessDefaultCaps {
  if (typeof stored !== 'object' || stored === null) return {}
  const { spendUsdCap, wallClockMs, maxIterations } = stored as Record<string, unknown>
  return {
    ...(isPositive(spendUsdCap) ? { spendUsdCap } : {}),
    ...(isWhole(wallClockMs) ? { wallClockMs } : {}),
    ...(isWhole(maxIterations) ? { maxIterations } : {}),
  }
}

/** A project's default caps under the names a launch carries them. Pure. */
export function launchCapsOfDefaults(defaults: ProjectProcessDefaultCaps): LaunchCaps {
  const { spendUsdCap, wallClockMs, maxIterations } = defaults
  return {
    ...(spendUsdCap !== undefined ? { spendCapUsd: spendUsdCap } : {}),
    ...(wallClockMs !== undefined ? { wallClockMs } : {}),
    ...(maxIterations !== undefined ? { maxIterations } : {}),
  }
}

/** The project editor's fields: the three limits a project can set. Pure. */
export function processDefaultCapFields(
  defaults: ProjectProcessDefaultCaps,
  typed: LaunchCapsTyped,
): LaunchCapFieldView[] {
  return PROJECT_CAP_KEYS.map((key) =>
    fieldOf(key, defaultOf(key, defaults), typed[key], undefined, false),
  )
}

/** What stops the project editor saving: the first limit in error and why. None when it can. Pure. */
export function processDefaultCapsError(fields: readonly LaunchCapFieldView[]): string | undefined {
  const field = fields.find((candidate) => candidate.error)
  return field?.error ? LAUNCH_CAPS_COPY.defaultBlocked(field.label, field.error) : undefined
}

/**
 * A project's metadata with its default caps as edited, without the key once
 * none is set. A field in error keeps the limit the metadata held. Pure.
 */
export function withProcessDefaultCaps<T extends Record<string, unknown>>(
  metadata: T,
  fields: readonly LaunchCapFieldView[],
): T {
  const held = launchCapsOfDefaults(readProcessDefaultCaps(metadata.processDefaultCaps))
  const inError = fields.flatMap(({ key, error }) =>
    error && held[key] !== undefined ? [[key, held[key]]] : [],
  )
  const { spendCapUsd, wallClockMs, maxIterations } = {
    ...capsOf(fields),
    ...(Object.fromEntries(inError) as LaunchCaps),
  }
  const caps: ProjectProcessDefaultCaps = {
    ...(spendCapUsd !== undefined ? { spendUsdCap: spendCapUsd } : {}),
    ...(wallClockMs !== undefined ? { wallClockMs } : {}),
    ...(maxIterations !== undefined ? { maxIterations } : {}),
  }
  const { processDefaultCaps: _dropped, ...rest } = metadata
  return (Object.keys(caps).length > 0 ? { ...rest, processDefaultCaps: caps } : rest) as T
}
