/** A project's live check env, read and checked for its editor. Pure. */

import { CHECK_HOST_ENV_NAMES, CHECK_HOST_ENV_SECRET_NAME } from 'thefactory-tools/constants'
import type { ProjectCheckEnvSetting } from 'thefactory-tools/types'

import { PROJECT_CHECK_ENV_ERRORS } from './projectCheckEnvConstants'
import type { ProjectCheckEnvRowErrors, ProjectCheckEnvRows } from './projectCheckEnvTypes'

const ENV_VAR_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

/** The live check env a project's metadata sets; none when it sets no value and no secret. Pure. */
export function projectCheckEnvOf(
  metadata: Record<string, unknown> | undefined,
): ProjectCheckEnvSetting | undefined {
  const set = metadata?.checkEnv
  if (typeof set !== 'object' || set === null) return undefined
  const { values, secrets } = set as ProjectCheckEnvSetting
  const keptValues =
    values && typeof values === 'object'
      ? Object.fromEntries(Object.entries(values).filter(([, v]) => typeof v === 'string'))
      : {}
  const keptSecrets = Array.isArray(secrets)
    ? secrets.filter((s) => typeof s?.name === 'string' && typeof s?.noteId === 'string')
    : []
  return projectCheckEnvFromRows({
    values: Object.entries(keptValues).map(([name, value]) => ({ name, value })),
    secrets: keptSecrets.map(({ name, noteId }) => ({ name, noteId })),
  })
}

/** The editor's rows for a setting, in its order. Pure. */
export function projectCheckEnvRows(
  setting: ProjectCheckEnvSetting | undefined,
): ProjectCheckEnvRows {
  return {
    values: Object.entries(setting?.values ?? {}).map(([name, value]) => ({ name, value })),
    secrets: (setting?.secrets ?? []).map(({ name, noteId }) => ({ name, noteId })),
  }
}

/**
 * The setting the rows make: names trimmed, a row left wholly blank dropped,
 * every other row kept as typed so a save is refused rather than losing it;
 * none once nothing is left. Pure.
 */
export function projectCheckEnvFromRows(
  rows: ProjectCheckEnvRows,
): ProjectCheckEnvSetting | undefined {
  const values = rows.values
    .map((row) => ({ name: row.name.trim(), value: row.value }))
    .filter((row) => row.name || row.value)
  const secrets = rows.secrets
    .map((row) => ({ name: row.name.trim(), noteId: row.noteId }))
    .filter((row) => row.name || row.noteId)
  if (values.length === 0 && secrets.length === 0) return undefined
  return {
    ...(values.length > 0
      ? { values: Object.fromEntries(values.map((row) => [row.name, row.value])) }
      : {}),
    ...(secrets.length > 0 ? { secrets } : {}),
  }
}

function nameError(name: string, seen: Set<string>): string | undefined {
  if (!name) return PROJECT_CHECK_ENV_ERRORS.noName
  if (!ENV_VAR_NAME.test(name)) return PROJECT_CHECK_ENV_ERRORS.badName(name)
  if (CHECK_HOST_ENV_NAMES.includes(name)) return PROJECT_CHECK_ENV_ERRORS.hostName(name)
  if (seen.has(name)) return PROJECT_CHECK_ENV_ERRORS.twice(name)
  return undefined
}

/**
 * Why each row cannot be saved — the rules the backend holds the setting to: a
 * variable name, not one the host sets, each name once across both lists, no
 * secret-looking name among the plain values, and a note for every secret. A
 * wholly blank row is fine: it is dropped. Pure.
 */
export function projectCheckEnvRowErrors(rows: ProjectCheckEnvRows): ProjectCheckEnvRowErrors {
  const seen = new Set<string>()
  const values = rows.values.map((row) => {
    const name = row.name.trim()
    if (!name && !row.value) return undefined
    const error =
      nameError(name, seen) ??
      (CHECK_HOST_ENV_SECRET_NAME.test(name)
        ? PROJECT_CHECK_ENV_ERRORS.secretValue(name)
        : undefined)
    seen.add(name)
    return error
  })
  const secrets = rows.secrets.map((row) => {
    const name = row.name.trim()
    if (!name && !row.noteId) return undefined
    const error =
      nameError(name, seen) ?? (row.noteId ? undefined : PROJECT_CHECK_ENV_ERRORS.noNote)
    seen.add(name)
    return error
  })
  return { values, secrets }
}

/** The first reason the setting cannot be saved; none when it can, or when nothing is set. Pure. */
export function projectCheckEnvError(
  setting: ProjectCheckEnvSetting | undefined,
): string | undefined {
  const errors = projectCheckEnvRowErrors(projectCheckEnvRows(setting))
  return [...errors.values, ...errors.secrets].find((e): e is string => e !== undefined)
}
