import { useCallback, useMemo } from 'react'
import { Text, View } from 'react-native'

import {
  evidenceDataUri,
  GROUP_SIGN_OFF_TEXT,
  signOffAttachmentFileName,
  useGroupSignOff,
  useRunWalkthrough,
  type GroupSignOffAttachmentRow,
  type GroupSignOffRepoRow,
  type ProcessGroupRun,
} from '../../../../headless'
import type { ChatAttachmentFile } from '../../../../headless/api'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import Alert from '../../../primitives/Alert'
import type { SaveFileHandler } from '../../chat/signoff'
import StorySignoffReview, { type StorySignoffExtraChip } from '../StorySignoffReview'
import GroupSignOff from './GroupSignOff'
import LoomWalkthroughPanel from './LoomWalkthroughPanel'

const ANY_FILE = 'application/octet-stream'

export type GroupSignOffSectionProps = {
  group: ProcessGroupRun
  onOpenLegRun: (runId: string, projectId: string) => void
  /** Puts a file where the user can reach it; downloads stay hidden without it. */
  onSaveFile?: SaveFileHandler
  /** The app's clipboard; without it the text stays selectable. */
  onCopy?: (text: string) => unknown
  /** The app's file picker, for a Loom walkthrough's video; without it a step takes a link alone. */
  pickLoomVideo?: () => Promise<ChatAttachmentFile[]>
}

function RepoLoom({
  runId,
  pickLoomVideo,
}: {
  runId: string
  pickLoomVideo: GroupSignOffSectionProps['pickLoomVideo']
}) {
  const { view, attachLink, attachFile } = useRunWalkthrough(runId)
  if (!view || view.left === 0) return null
  return (
    <LoomWalkthroughPanel
      view={view}
      attachLink={attachLink}
      attachFile={attachFile}
      {...(pickLoomVideo ? { pickVideo: pickLoomVideo } : {})}
    />
  )
}

/** Native peer of web's `GroupSignOffSection`: the group's one sign-off, live, in its group run's page. */
export default function GroupSignOffSection({
  group,
  onOpenLegRun,
  onSaveFile,
  onCopy,
  pickLoomVideo,
}: GroupSignOffSectionProps) {
  const { theme } = useNativeTheme()
  const signOff = useGroupSignOff(group.id)
  const { screen, readAttachment } = signOff
  const storyOf = useMemo(() => new Map(group.legs.map((l) => [l.id, l.storyId])), [group.legs])

  const download = useCallback(
    (row: GroupSignOffAttachmentRow) => {
      void readAttachment(row.attachment).then((bytes) => {
        const dataUri = bytes && evidenceDataUri(bytes, row.attachment.mediaType ?? ANY_FILE)
        if (dataUri) {
          void onSaveFile?.({ name: signOffAttachmentFileName(row.attachment), dataUri })
        }
      })
    },
    [readAttachment, onSaveFile],
  )

  const renderEvidence = useCallback(
    (repo: GroupSignOffRepoRow, chips: readonly StorySignoffExtraChip[]) => {
      const storyId = storyOf.get(repo.legId)
      if (!repo.runId || !storyId) {
        return (
          <Text style={{ fontSize: 13, color: theme.text.muted }}>{GROUP_SIGN_OFF_TEXT.noRun}</Text>
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
          {...(onSaveFile ? { onSaveFile } : {})}
          {...(pickLoomVideo ? { pickLoomVideo } : {})}
        />
      )
    },
    [storyOf, theme, onSaveFile, pickLoomVideo],
  )

  if (!screen) {
    return signOff.readError ? (
      <Alert variant="error">{signOff.readError}</Alert>
    ) : (
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>
        {GROUP_SIGN_OFF_TEXT.loading}
      </Text>
    )
  }
  return (
    <View style={{ gap: 12 }}>
      {signOff.readError ? <Alert variant="error">{signOff.readError}</Alert> : null}
      <GroupSignOff
        screen={screen}
        outputs={signOff.outputs}
        outputActions={signOff.outputActions}
        acting={signOff.acting}
        actionError={signOff.actionError}
        onDecide={signOff.decide}
        onRetry={signOff.retry}
        {...(onSaveFile ? { onDownload: download } : {})}
        {...(onCopy ? { onCopy } : {})}
        onOpenRun={onOpenLegRun}
        renderEvidence={renderEvidence}
        {...(screen.loomLeft > 0
          ? {
              loom: screen.repos.flatMap((repo) =>
                repo.runId
                  ? [<RepoLoom key={repo.legId} runId={repo.runId} pickLoomVideo={pickLoomVideo} />]
                  : [],
              ),
            }
          : {})}
      />
    </View>
  )
}
