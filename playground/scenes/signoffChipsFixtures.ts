import {
  buildStorySignoff,
  type BuildStorySignoffInput,
  type CheckMethodRow,
  type StorySignoffProcessRun,
} from 'thefactory-ui/headless'

type Evidence = BuildStorySignoffInput['evidence'][number]

const REPLACED = {
  supersededBy: { processRunId: 'run-2', entryId: 'entry-2', stepId: 'checks' },
} as Partial<Evidence>

const CHIP_IDS = ['screens', 'walkthrough', 'report'] as const

/**
 * Sign-off chips for a feature whose first try was replaced.
 *
 * `replaced-only` — one screenshot, one recording and one report, each
 * `supersededBy` naming run-2's checks entry. Screens, Walkthrough and Report are not passed.
 *
 * `one-current` — those, plus one current of each. The chip lines read
 * "1 screenshot captured", "1 recording captured" and "A report was written".
 */
export function signoffChipRows(current: boolean): CheckMethodRow[] {
  const filing = (id: string, kind: Evidence['kind'], mediaType: string, replaced: boolean) =>
    ({
      id,
      runId: 'ra',
      projectId: 'p',
      featureId: 'f1',
      kind,
      path: id,
      mediaType,
      bytes: 10,
      createdAt: 1,
      ...(replaced ? REPLACED : {}),
    }) as Evidence

  const evidence: Evidence[] = [
    filing('old-shot', 'screenshot', 'image/png', true),
    filing('old-rec', 'recording', 'video/mp4', true),
    filing('old-report', 'report', 'text/markdown', true),
  ]
  if (current) {
    evidence.push(
      filing('shot', 'screenshot', 'image/png', false),
      filing('rec', 'recording', 'video/mp4', false),
      filing('report', 'report', 'text/markdown', false),
    )
  }

  const signoff = buildStorySignoff({
    features: [{ id: 'f1', title: 'One' }],
    processRuns: [{ id: 'pr1', featureId: 'f1', ledger: [] } as unknown as StorySignoffProcessRun],
    cliRuns: [
      { id: 'ra', processRunId: 'pr1', createdAt: 1 } as BuildStorySignoffInput['cliRuns'][number],
    ],
    evidence,
  })
  const feature = signoff.features[0]
  if (!feature) return []
  return CHIP_IDS.flatMap((id) => {
    const row = feature.rows.find((item) => item.id === id)
    return row ? [row] : []
  })
}
