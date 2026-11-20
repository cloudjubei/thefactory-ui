import type {
  GetProcessRunEvidenceResponse,
  ListReviewEvidenceResponse,
} from '../../headless/api/generated/types.gen'
import { FAKE_PROJECT_ID, FAKE_PROJECTS } from './projects'
import { fakeRunThroughEvidence } from './runThroughRun'
import { fakeScriptEvidence } from './scriptStepRun'
import { fakeVariantEvidence } from './variantRun'

/** The runs' evidence groups, as `GET /process-runs/:runId/evidence` lists them. */
export type FakeFiledGroup = GetProcessRunEvidenceResponse['groups'][number]

/** One item a run fixture filed. */
export type FakeFiled = FakeFiledGroup['evidence'][number]

/** One filed item, with the run that filed it. */
export interface FakeFiledItem {
  ref: FakeFiled
  group: FakeFiledGroup
}

/** The filters `GET /projects/:projectId/review-evidence` takes, each matched on the item. */
const FILTERS = ['runId', 'storyId', 'featureId', 'chatContextId'] as const

/**
 * Every item the run fixtures file, each once, with the run it was filed in:
 * a variant run's at every state, the script step's, then the run-through's,
 * the first filing of an id kept.
 */
function filedItems(): ReadonlyMap<string, FakeFiledItem> {
  const groups: FakeFiledGroup[] = [
    ...(['done', 'parked', 'running'] as const).flatMap(
      (state) => fakeVariantEvidence(state).groups,
    ),
    ...(['stopped', 'two-sections', 'take-overs'] as const).flatMap(
      (state) => fakeScriptEvidence(state).groups,
    ),
    ...fakeRunThroughEvidence().groups,
  ]
  const filed = new Map<string, FakeFiledItem>()
  for (const group of groups) {
    for (const ref of group.evidence) if (!filed.has(ref.id)) filed.set(ref.id, { ref, group })
  }
  return filed
}

const FILED = filedItems()

/** One item the run fixtures filed, by its id, with the run that filed it. */
export const fakeFiledEvidence = (evidenceId: string): FakeFiledItem | undefined =>
  FILED.get(evidenceId)

/**
 * What `GET /projects/:projectId/review-evidence` answers: the project's filed
 * items matching every filter given, newest first. `undefined` for a project
 * the fake does not hold.
 */
export function fakeReviewEvidenceList(
  projectId: string,
  query: URLSearchParams,
): ListReviewEvidenceResponse | undefined {
  if (!FAKE_PROJECTS.some((project) => project.id === projectId)) return undefined
  if (projectId !== FAKE_PROJECT_ID) return []
  return [...FILED.values()]
    .map(({ ref }) => ref)
    .filter((ref) =>
      FILTERS.every((filter) => {
        const wanted = query.get(filter)
        return !wanted || ref[filter] === wanted
      }),
    )
    .sort((a, b) => b.createdAt - a.createdAt)
}
