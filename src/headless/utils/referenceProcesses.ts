import type { ProcessDefinition, ReferenceProcess } from 'thefactory-tools/types'

/** The processes a project can run, as its references point at them: name and the steps it runs. */
export function referenceProcessesOf(
  definitions: readonly ProcessDefinition[],
): ReferenceProcess[] {
  return definitions.map((d) => ({
    id: d.id,
    name: d.name,
    steps: d.steps.filter((s) => s.enabled !== false).map((s) => s.name),
  }))
}
