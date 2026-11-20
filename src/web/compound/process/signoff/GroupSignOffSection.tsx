import { useCallback, useMemo, type ReactNode } from 'react'

import {
  GROUP_SIGN_OFF_TEXT,
  signOffAttachmentFileName,
  processRunChatContext,
  TEST_SESSION_COPY,
  useGroupSignOff,
  type LaunchModelChipSlot,
  type ProcessRunChatOpened,
  type RunModelChipSlot,
  useRunWalkthrough,
  type GroupSignOffAttachmentRow,
  type GroupSignOffRepoRow,
  type ProcessGroupRun,
} from '../../../../headless'
import Alert from '../../../primitives/Alert'
import StorySignoffReview, { type StorySignoffExtraChip } from '../StorySignoffReview'
import { GroupTicketUpdatePanel } from '../TicketUpdateCard'
import GroupSignOff from './GroupSignOff'
import TestWithMeCard from './TestWithMeCard'
import LoomWalkthroughPanel from './LoomWalkthroughPanel'

export type GroupSignOffSectionProps = {
  /** The host's model chip, for the agent "Test with me" starts its helper on. */
  renderModelChip?: (slot: RunModelChipSlot) => ReactNode
  /** Open a chat: where "Test with me"'s helper works. */
  onOpenChat?: (opened: ProcessRunChatOpened) => void
  group: ProcessGroupRun
  onOpenLegRun: (runId: string, projectId: string) => void
}

const REVOKE_AFTER_MS = 60_000

function saveBytes(bytes: ArrayBuffer, row: GroupSignOffAttachmentRow): void {
  const { mediaType } = row.attachment
  const blob = new Blob([bytes], mediaType ? { type: mediaType } : {})
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = signOffAttachmentFileName(row.attachment)
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS)
}

function RepoLoom({ runId }: { runId: string }) {
  const { view, attachLink, attachFile } = useRunWalkthrough(runId)
  if (!view || view.left === 0) return null
  return <LoomWalkthroughPanel view={view} attachLink={attachLink} attachFile={attachFile} />
}

/** The group's one sign-off, live, in its group run's page. */
export default function GroupSignOffSection({
  group,
  onOpenLegRun,
  renderModelChip,
  onOpenChat,
}: GroupSignOffSectionProps) {
  const signOff = useGroupSignOff(group.id)
  const testRepo = signOff.screen?.repos.find((repo) => repo.runId)
  const { screen, readAttachment } = signOff
  const storyOf = useMemo(() => new Map(group.legs.map((l) => [l.id, l.storyId])), [group.legs])

  const download = useCallback(
    (row: GroupSignOffAttachmentRow) => {
      void readAttachment(row.attachment).then((bytes) => {
        if (bytes) saveBytes(bytes, row)
      })
    },
    [readAttachment],
  )

  const renderEvidence = useCallback(
    (repo: GroupSignOffRepoRow, chips: readonly StorySignoffExtraChip[]) => {
      const storyId = storyOf.get(repo.legId)
      if (!repo.runId || !storyId) {
        return (
          <span className="text-[12.5px] text-(--text-muted)">{GROUP_SIGN_OFF_TEXT.noRun}</span>
        )
      }
      return (
        <StorySignoffReview
          key={repo.legId}
          projectId={repo.projectId}
          storyId={storyId}
          storyRunId={repo.runId}
          evidenceCardOnly
          extraChips={chips}
        />
      )
    },
    [storyOf],
  )

  if (!screen) {
    return signOff.readError ? (
      <Alert variant="error">{signOff.readError}</Alert>
    ) : (
      <div className="text-[12.5px] text-(--text-secondary)">{GROUP_SIGN_OFF_TEXT.loading}</div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {signOff.readError ? <Alert variant="error">{signOff.readError}</Alert> : null}
      <GroupSignOff
        screen={screen}
        outputs={signOff.outputs}
        outputActions={signOff.outputActions}
        acting={signOff.acting}
        actionError={signOff.actionError}
        onDecide={signOff.decide}
        onRetry={signOff.retry}
        onDownload={download}
        onOpenRun={onOpenLegRun}
        renderEvidence={renderEvidence}
        ticketUpdate={
          <GroupTicketUpdatePanel
            groupRunId={group.id}
            revision={`${group.updatedAt}:${signOff.outputs
              .flatMap((output) => output.panel.sections.map((section) => section.text ?? ''))
              .join('\u0000')}`}
          />
        }
        {...(screen.loomLeft > 0
          ? {
              loom: screen.repos.flatMap((repo) =>
                repo.runId ? [<RepoLoom key={repo.legId} runId={repo.runId} />] : [],
              ),
            }
          : {})}
      />
      {testRepo?.runId ? (
        <TestWithMeCard
          runId={testRepo.runId}
          {...(renderModelChip
            ? {
                renderModelChip: (slot: LaunchModelChipSlot) =>
                  renderModelChip({
                    ...slot,
                    chatContext: processRunChatContext({
                      id: testRepo.runId!,
                      projectId: testRepo.projectId,
                    }),
                    note: TEST_SESSION_COPY.chipNote,
                  }),
              }
            : {})}
          {...(onOpenChat ? { onOpenChat } : {})}
        />
      ) : null}
    </div>
  )
}
