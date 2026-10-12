import {
  PROCESS_ALREADY_LANDED_ACTION_COPY,
  PROCESS_ALREADY_LANDED_TEXT,
} from 'thefactory-tools/constants'
import type {
  ProcessIntegrationLandedBy,
  ProcessIntegrationMode,
  ProcessRun,
  ProcessWorkBranch,
} from 'thefactory-tools/types'
import { processAlreadyLandedSince, processAlreadyLandedText } from 'thefactory-tools/utils'

import { processIntegrationChoices } from './processIntegration'
import { PROCESS_ALREADY_LANDED_OFFER_DETAIL } from './processAlreadyLandedConstants'
import type {
  ProcessAlreadyLandedOffer,
  ProcessAlreadyOnBaseSignOff,
  ProcessRunLandingPreview,
} from './processAlreadyLandedTypes'

/**
 * "Finish as already landed" on an approved run whose work did not land: what
 * git found — where the base has held the work since — the features of its
 * story the run worked and whether finishing makes each done, and what
 * finishing does. `undefined` unless the server read the base as holding it. Pure.
 */
export function processAlreadyLandedOffer(
  run: Pick<ProcessRun, 'storyId' | 'workBranch'>,
  preview: ProcessRunLandingPreview | undefined,
): ProcessAlreadyLandedOffer | undefined {
  const branch = run.workBranch
  if (!preview?.offered || preview.check.kind !== 'already-landed' || !branch) return undefined
  const { landedBy } = preview.check
  return {
    text: processAlreadyLandedText(branch.baseRef, landedBy),
    sha: landedBy.commit,
    features: preview.features.map((f) => ({
      dependency: run.storyId ? `${run.storyId}.${f.id}` : f.id,
      title: f.title,
      becomesDone: f.after === 'done' && f.status !== 'done',
    })),
    label: PROCESS_ALREADY_LANDED_ACTION_COPY.label,
    detail: PROCESS_ALREADY_LANDED_OFFER_DETAIL(branch.name),
  }
}

/**
 * A sign-off whose work branch adds nothing its base does not already hold:
 * what the decision card says up front, the Approve button's words, and the
 * decision it sends — the first way offered, since nothing is merged and so
 * nothing more is asked. `undefined` when the base does not hold the work. Pure.
 */
export function processAlreadyOnBaseSignOff(
  workBranch: Pick<ProcessWorkBranch, 'name' | 'baseRef' | 'shadow'>,
  alreadyOnBase: Pick<ProcessIntegrationLandedBy, 'commit' | 'subject'> | undefined,
  modes?: readonly ProcessIntegrationMode[],
): ProcessAlreadyOnBaseSignOff | undefined {
  if (!alreadyOnBase) return undefined
  const mode = processIntegrationChoices(workBranch, modes)[0]?.mode ?? 'merge'
  return {
    notice: PROCESS_ALREADY_LANDED_TEXT.signOff(
      workBranch.baseRef,
      processAlreadyLandedSince(alreadyOnBase),
    ),
    approveLabel: PROCESS_ALREADY_LANDED_TEXT.approve(workBranch.baseRef),
    decision: { mode },
  }
}
