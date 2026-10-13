import type { ParsedReference, ReferenceDescription, ReferenceTarget } from 'thefactory-tools/types'

/** The run a reference or an in-app link points at, when it points at one. */
export function referencedRunId(target: ReferenceTarget): string | undefined {
  if (target.type === 'link') return target.link.kind === 'run' ? target.link.runId : undefined
  if (target.type === 'reference' && target.reference.kind === 'run') return target.reference.runId
  return undefined
}

/** A story as its chip reads — `#8 Fixture rework` — or `undefined` where the chat cannot name it. */
export function storyChipLabel(
  describe: (parsed: ParsedReference) => ReferenceDescription | undefined,
  projectId: string,
  storyId: string,
): string | undefined {
  const story = describe({ type: 'reference', reference: { kind: 'story', projectId, storyId } })
  if (!story || story.missing || story.loading) return undefined
  return story.title ? `${story.label} ${story.title}` : story.label
}
