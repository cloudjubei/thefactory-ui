/** A project's generators, read, edited and checked for its editor and its checks listing. Pure. */

import type { ProjectGeneratorSetting } from 'thefactory-tools/types'
import { validateProjectGeneratorSettings } from 'thefactory-tools/validations'

import {
  PROJECT_GENERATOR_ERROR_LEAD,
  PROJECT_GENERATOR_FROM_LINE,
} from './projectGeneratorsConstants'
import type { ProjectGeneratorErrors, ProjectGeneratorLine } from './projectGeneratorsTypes'

const ERROR_AT = /^generators\[(\d+)\]\.?/

/** The generators a project's metadata declares, as they are; none when it declares none. Pure. */
export function projectGeneratorsOf(
  metadata: Record<string, unknown> | undefined,
): ProjectGeneratorSetting[] | undefined {
  const set = metadata?.generators
  return Array.isArray(set) && set.length > 0 ? (set as ProjectGeneratorSetting[]) : undefined
}

/** A new generator, every field empty. Pure. */
export function blankProjectGenerator(): ProjectGeneratorSetting {
  return { name: '', command: '', inputs: [], outputs: [''] }
}

/**
 * Why each generator cannot be saved — the rules the backend holds the
 * setting to (`validateProjectGeneratorSettings`), each said without the
 * setting's own field path. None for generators that can be saved. Pure.
 */
export function projectGeneratorErrors(
  generators: readonly ProjectGeneratorSetting[] | undefined,
): ProjectGeneratorErrors {
  const out: ProjectGeneratorErrors = {}
  for (const error of validateProjectGeneratorSettings(generators).errors) {
    const at = ERROR_AT.exec(error)
    if (!at) continue
    const index = Number(at[1])
    out[index] = [...(out[index] ?? []), error.slice(at[0].length)]
  }
  return out
}

/** The first reason the generators cannot be saved, naming the generator; none when they can. Pure. */
export function projectGeneratorsError(
  generators: readonly ProjectGeneratorSetting[] | undefined,
): string | undefined {
  const errors = projectGeneratorErrors(generators)
  const first = Object.keys(errors)
    .map(Number)
    .sort((a, b) => a - b)[0]
  if (first === undefined) return undefined
  return `${PROJECT_GENERATOR_ERROR_LEAD(first, generators?.[first]?.name ?? '')} ${errors[first]![0]}`
}

/** The metadata with the generators set, or without the key once there are none. Pure. */
export function withProjectGenerators<M extends Record<string, unknown>>(
  metadata: M,
  generators: readonly ProjectGeneratorSetting[] | undefined,
): M {
  const { generators: _was, ...rest } = metadata
  return (
    generators && generators.length > 0 ? { ...rest, generators: [...generators] } : rest
  ) as M
}

/** Each generator as the checks listing shows it: another project's input as that project's file. Pure. */
export function projectGeneratorLines(
  generators: readonly ProjectGeneratorSetting[] | undefined,
): ProjectGeneratorLine[] {
  return (generators ?? []).map((generator) => ({
    name: generator.name,
    command: generator.command,
    reads: generator.inputs.map((input) =>
      input.from ? PROJECT_GENERATOR_FROM_LINE(input.from.projectId, input.from.path) : input.path,
    ),
    writes: [...generator.outputs],
  }))
}
