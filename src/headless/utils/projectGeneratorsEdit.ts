/** Edits to a project's generators list, one generator, input or output at a time. Pure. */

import type { ProjectGeneratorInput, ProjectGeneratorSetting } from 'thefactory-tools/types'

/** The list with the generator at `at` replaced by `next`. Pure. */
export function withProjectGeneratorAt(
  generators: readonly ProjectGeneratorSetting[],
  at: number,
  next: ProjectGeneratorSetting,
): ProjectGeneratorSetting[] {
  return generators.map((generator, i) => (i === at ? next : generator))
}

/** The list without the generator at `at`. Pure. */
export function withoutProjectGeneratorAt(
  generators: readonly ProjectGeneratorSetting[],
  at: number,
): ProjectGeneratorSetting[] {
  return generators.filter((_, i) => i !== at)
}

/**
 * An input switched between a path the command reads and another project's
 * file: that project and where the file is in it, kept for when it is
 * switched back. Pure.
 */
export function withProjectGeneratorInputFrom(
  input: ProjectGeneratorInput,
  fromProject: boolean,
): ProjectGeneratorInput {
  if (!fromProject) return { path: input.path }
  return { path: input.path, from: input.from ?? { projectId: '', path: '' } }
}

/**
 * The projects an input can read another project's file from: every project
 * but the one being edited, with any already chosen that the list does not
 * hold — so a choice never vanishes from its picker. Sorted. Pure.
 */
export function projectGeneratorSourceProjects(
  projectIds: readonly string[],
  editing: string | undefined,
  generators: readonly ProjectGeneratorSetting[] | undefined,
): string[] {
  const chosen = (generators ?? []).flatMap((g) =>
    g.inputs.map((input) => input.from?.projectId ?? ''),
  )
  const ids = new Set([...projectIds, ...chosen].filter((id) => id !== '' && id !== editing))
  return [...ids].sort()
}
