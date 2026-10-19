import { alreadyOnBaseView, commitReceiptFiles, landFailureSummary } from 'thefactory-ui/headless'
import type { CliRunLandFailure } from '../../src/headless/api/generated'
// Not on the package's public surface: the change card draws them itself. The showcase reaches into
// the source for them, as the playground renders the library from source anyway.
import { AlreadyOnBaseLine } from '../../src/web/compound/chat/AlreadyOnBaseLine'
import { RunLandNotice } from '../../src/web/compound/chat/RunLandNotice'
import type { Scene } from '../showcase/types'

const AT = Date.UTC(2026, 9, 18, 9, 0)

/** The notice where the change card puts it, under the turn whose changes it is about. */
function Notice({ failure }: { failure: CliRunLandFailure }) {
  return (
    <div className="max-w-3xl rounded-md border border-(--border-default) bg-(--surface-raised) px-3 py-3">
      <RunLandNotice summary={landFailureSummary(failure)} />
    </div>
  )
}

/** What the review shows in place of everything else when its base already holds the change. */
function AlreadyOnBase({ failure }: { failure: CliRunLandFailure }) {
  const view = alreadyOnBaseView(failure)
  if (!view) return null
  return (
    <div className="max-w-3xl">
      <AlreadyOnBaseLine
        text={view.text}
        {...(view.sha
          ? {
              change: {
                files: commitReceiptFiles([
                  { path: 'design/drafts/10-chip-slots-v5.html', status: 'modified' },
                  { path: 'design/drafts/index.html', status: 'modified' },
                ]),
                ...(view.subject ? { message: view.subject } : {}),
              },
            }
          : {})}
      />
    </div>
  )
}

export const LAND_NOTICE_SCENES: Scene[] = [
  {
    id: 'run-land-notice',
    title: 'Changes not on a review branch',
    component: 'CliRunArtifactPanel (RunLandNotice)',
    group: 'Chat',
    description:
      'Why a run’s changes are not on a review branch. Changes that could not be committed are a warning; changes the branch already has are one neutral line in place of the whole review — no verdict, checks, Apply or Discard: nothing failed and there is nothing to review.',
    states: [
      {
        id: 'already-on-base',
        title: 'Already on dev',
        description:
          'Every change the run made is already on dev, in the commit named: one neutral line, with the change one click away.',
        render: () => (
          <AlreadyOnBase
            failure={{
              reason: 'already-on-base',
              baseRef: 'dev',
              message:
                'Every change this run made to its 2 files already reads that way on dev — there is nothing new to review.',
              landedBy: {
                sha: '0956f8c41d2e9a7b3c5d',
                subject: 'Draft 10: upright plaque, one gem wide',
              },
              at: AT,
            }}
          />
        ),
      },
      {
        id: 'already-on-base-older',
        title: 'Already on dev — older record',
        description: 'A record that names no commit: the line alone.',
        render: () => (
          <AlreadyOnBase failure={{ reason: 'already-on-base', baseRef: 'dev', at: AT }} />
        ),
      },
      {
        id: 'not-committed',
        title: 'Not committed',
        description:
          'The look-alike it differs from: the changes could not be committed, so the note is a warning with the reason.',
        render: () => (
          <Notice
            failure={{
              reason: 'commit-failed',
              message: 'fatal: unable to write new index file',
              at: AT,
            }}
          />
        ),
      },
    ],
  },
]
