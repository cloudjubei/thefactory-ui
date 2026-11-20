/** A project's check commands, read and checked for its editor. Pure. */

import type { ProjectCheckCommandsSetting } from 'thefactory-tools/types'
import { validateProjectCheckCommandsSetting } from 'thefactory-tools/validations'

import { PROJECT_CHECK_COMMANDS_FIELD_NAMES } from './projectCheckCommandsConstants'
import type { ProjectCheckCommandsErrors } from './projectCheckCommandsTypes'

const FIELDS = ['relatedTests', 'formatFix'] as const

/** The check commands a project's metadata declares, each as typed; none when it declares none. Pure. */
export function projectCheckCommandsOf(
  metadata: Record<string, unknown> | undefined,
): ProjectCheckCommandsSetting | undefined {
  const set = metadata?.checkCommands
  if (typeof set !== 'object' || set === null) return undefined
  const record = set as Record<string, unknown>
  return projectCheckCommandsFrom(
    Object.fromEntries(FIELDS.map((field) => [field, record[field]])) as Record<string, unknown>,
  )
}

/** The setting the fields make: a field left blank dropped; none once both are blank. Pure. */
export function projectCheckCommandsFrom(
  fields: Partial<Record<(typeof FIELDS)[number], unknown>>,
): ProjectCheckCommandsSetting | undefined {
  const kept = FIELDS.flatMap((field) => {
    const value = fields[field]
    return typeof value === 'string' && value.trim().length > 0 ? [[field, value] as const] : []
  })
  return kept.length > 0 ? (Object.fromEntries(kept) as ProjectCheckCommandsSetting) : undefined
}

/**
 * Why each command cannot be saved — the rules the backend holds the setting
 * to (`validateProjectCheckCommandsSetting`), each said after its field's name.
 * None for a setting that can be saved, or none at all. Pure.
 */
export function projectCheckCommandsErrors(
  setting: ProjectCheckCommandsSetting | undefined,
): ProjectCheckCommandsErrors {
  const { errors } = validateProjectCheckCommandsSetting(setting)
  const out: ProjectCheckCommandsErrors = {}
  for (const field of FIELDS) {
    const lead = `checkCommands.${field} `
    const error = errors.find((e) => e.startsWith(lead))
    if (error)
      out[field] = `${PROJECT_CHECK_COMMANDS_FIELD_NAMES[field]} ${error.slice(lead.length)}.`
  }
  return out
}

/** The first reason the setting cannot be saved; none when it can. Pure. */
export function projectCheckCommandsError(
  setting: ProjectCheckCommandsSetting | undefined,
): string | undefined {
  const errors = projectCheckCommandsErrors(setting)
  return errors.relatedTests ?? errors.formatFix
}
