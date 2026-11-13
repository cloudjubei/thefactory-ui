import { useEffect, useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { ProcessResumeChoice, ProcessRun } from 'thefactory-tools/types'
import { processRunParkChoices } from 'thefactory-tools/utils'
import {
  FilesProvider,
  changeLiveCheckDraft,
  launchFeatureRows,
  launchProofPlanRows,
  processProposalView,
  proofPlanMetadata,
  setLaunchLiveCheck,
  setLaunchProofNotes,
  toggleLaunchProofKind,
  type LaunchProofPlanEdits,
  choiceTakesNote,
  isResumeParkChoice,
  launchLiveCheckView,
  liveCheckWatchView,
  parkNoteCopy,
  parkNoteRequired,
  processParkAnswersView,
  storyLaunchGrant,
  useProjects,
  type LiveCheckDraft,
} from 'thefactory-ui/headless'
import ApprovalPanel from '../../src/native/compound/chat/ApprovalPanel'
import LaunchFeatureList from '../../src/native/compound/chat/LaunchFeatureList'
import LaunchLiveCheckRow from '../../src/native/compound/chat/LaunchLiveCheckRow'
import GroupStoryRunDialog from '../../src/native/compound/groupStories/GroupStoryRunDialog'
import LiveCheckWatchHeader from '../../src/native/compound/process/LiveCheckWatchHeader'
import ParkAnswers from '../../src/native/compound/process/ParkAnswers'
import ParkNoteComposer from '../../src/native/compound/process/ParkNoteComposer'
import ProjectNotesForm from '../../src/native/compound/settings/ProjectNotesForm'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import {
  LIVE_CHECK_NOTE_ROUTES,
  LIVE_CHECK_OFFERS,
  LIVE_CHECK_OPEN_NOTE,
  LIVE_CHECK_ROW_STATES,
  LIVE_CHECK_STORY_ID,
  LIVE_CHECK_WATCH_SPENT_RUN,
  liveCheckGroupPreview,
  liveCheckLaunchProposal,
  liveCheckLaunchRoutes,
  liveCheckWatchRun,
} from '../scenes/liveCheckFixtures'
import { OnFixtures } from '../scenes/onFixtures'
import type { NativeView } from './views'

const noop = () => {}
const resolved = async () => {}

function Sent({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <Text testID="sent" style={{ fontSize: 11, paddingHorizontal: 12, color: theme.text.muted }}>
      {children}
    </Text>
  )
}

function InProject({ children }: { children: ReactNode }) {
  const { setActiveProjectId } = useProjects()
  useEffect(() => setActiveProjectId(FAKE_PROJECT_ID), [setActiveProjectId])
  return children
}

function Row({ state }: { state: string }) {
  const start = LIVE_CHECK_ROW_STATES[state] ?? LIVE_CHECK_ROW_STATES.off!
  const [draft, setDraft] = useState<LiveCheckDraft>(start.draft)
  return (
    <OnFixtures routes={LIVE_CHECK_NOTE_ROUTES}>
      <View style={{ gap: 8, padding: 16, width: 390, maxWidth: '100%' }}>
        <LaunchLiveCheckRow
          view={launchLiveCheckView(LIVE_CHECK_OFFERS[start.offer], draft)}
          projectId={FAKE_PROJECT_ID}
          onChange={(change) => setDraft((prev) => changeLiveCheckDraft(prev, change))}
        />
        <Sent>Draft: {JSON.stringify(draft)}</Sent>
      </View>
    </OnFixtures>
  )
}

function Features({ offered }: { offered: boolean }) {
  const proposal = liveCheckLaunchProposal(offered ? 'ask-me' : undefined)
  const [edits, setEdits] = useState<LaunchProofPlanEdits>({})
  const rows = launchFeatureRows(
    processProposalView(proposal),
    launchProofPlanRows(proposal, edits),
  )
  return (
    <OnFixtures routes={LIVE_CHECK_NOTE_ROUTES}>
      <FilesProvider>
        <View style={{ gap: 8, padding: 16, width: 390, maxWidth: '100%' }}>
          <LaunchFeatureList
            storyId={LIVE_CHECK_STORY_ID}
            resolveBullet={(dependency) => ({ kind: 'missing', display: dependency })}
            rows={rows}
            tail={[]}
            save={false}
            projectId={FAKE_PROJECT_ID}
            onToggleKind={(featureId, kind) =>
              setEdits((prev) => toggleLaunchProofKind(proposal, prev, featureId, kind))
            }
            onNotesChange={(featureId, notes) =>
              setEdits((prev) => setLaunchProofNotes(proposal, prev, featureId, notes))
            }
            onLiveCheckChange={(featureId, change) =>
              setEdits((prev) => setLaunchLiveCheck(proposal, prev, featureId, change))
            }
            onSaveChange={noop}
          />
          <Sent>
            Sends: {JSON.stringify(proofPlanMetadata(proposal, edits, false)?.proofPlans ?? null)}
          </Sent>
        </View>
      </FilesProvider>
    </OnFixtures>
  )
}

function LaunchCard({ offered }: { offered: boolean }) {
  const [sent, setSent] = useState<string>()
  return (
    <OnFixtures routes={liveCheckLaunchRoutes(offered ? 'ask-me' : undefined)}>
      <FilesProvider>
        <InProject>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={{ width: 390, maxWidth: '100%' }}>
              <ApprovalPanel
                grant={storyLaunchGrant({
                  storyId: LIVE_CHECK_STORY_ID,
                  chatRunner: 'api',
                  onLaunch: async (metadata) =>
                    setSent(JSON.stringify(metadata.proofPlans ?? null)),
                  onCancel: noop,
                })}
                projectId={FAKE_PROJECT_ID}
                onDecideLater={noop}
              />
              {sent !== undefined ? <Sent>Sent proofPlans: {sent}</Sent> : null}
            </View>
          </ScrollView>
        </InProject>
      </FilesProvider>
    </OnFixtures>
  )
}

function GroupRunDialog() {
  return (
    <OnFixtures routes={LIVE_CHECK_NOTE_ROUTES}>
      <GroupStoryRunDialog
        isOpen
        onClose={noop}
        title="Read receipts"
        preview={liveCheckGroupPreview()}
        basePicks={{}}
        onPickBase={noop}
        onStart={async (body) => ({
          groupRunId: 'group-run-1',
          message: `Sent liveChecks: ${JSON.stringify(body.liveChecks ?? null)}`,
        })}
        onOpenRun={noop}
      />
    </OnFixtures>
  )
}

/** The stop on mobile as the park card draws it: the watch's header, then its answers. */
function Watch({ run, noteOpen }: { run: ProcessRun; noteOpen: boolean }) {
  const offered = processRunParkChoices(run).filter(isResumeParkChoice)
  const view = liveCheckWatchView(run, offered)
  const [selected, setSelected] = useState<string>()
  const [noteFor, setNoteFor] = useState<ProcessResumeChoice | undefined>(
    noteOpen ? 'send-to-developer' : undefined,
  )
  const offer = offered.find((c) => c.choice === noteFor)
  return (
    <OnFixtures routes={LIVE_CHECK_NOTE_ROUTES}>
      <FilesProvider>
        <View style={{ gap: 12, padding: 16, width: 390, maxWidth: '100%' }}>
          {view ? <LiveCheckWatchHeader view={view} /> : null}
          {noteFor ? (
            <ParkNoteComposer
              copy={parkNoteCopy(noteFor, offer, true)}
              required={parkNoteRequired(noteFor, offer)}
              onSend={() => setNoteFor(undefined)}
              onCancel={() => setNoteFor(undefined)}
            />
          ) : (
            <ParkAnswers
              view={processParkAnswersView(offered, undefined, selected)}
              onSelect={setSelected}
              onSend={(answer, note) => {
                if (!note && choiceTakesNote(answer.choice)) {
                  setNoteFor(answer.choice as ProcessResumeChoice)
                }
              }}
            />
          )}
        </View>
      </FilesProvider>
    </OnFixtures>
  )
}

function NoteForm({ state }: { state: string }) {
  return (
    <View style={{ padding: 16, width: 390, maxWidth: '100%' }}>
      <ProjectNotesForm
        mode={
          state === 'test-accounts'
            ? { kind: 'edit', note: LIVE_CHECK_OPEN_NOTE, onSubmit: resolved }
            : { kind: 'create', onSubmit: resolved }
        }
        onClose={noop}
      />
    </View>
  )
}

/**
 * Live check on a test account on a phone: the launch row (`?state=off`, `required`, `ask-me`,
 * `before-and-after`, `secret-hint`, `ask-first-note`, `card`, `whole-card` or `not-offered`), the group dialog, the "Watch it
 * live" stop (`?state=ready`, `problem`, `no-passes-left` or `send-note`) and a note's "Used for".
 */
export const LIVE_CHECK_VIEWS: NativeView[] = [
  {
    id: 'launch-live-check',
    title: 'Launch: live check on a test account',
    render: (address) => {
      const state = address.get('state') ?? 'off'
      if (state === 'card') return <Features offered />
      if (state === 'whole-card') return <LaunchCard offered />
      if (state === 'not-offered') return <Features offered={false} />
      return <Row key={state} state={state} />
    },
  },
  {
    id: 'group-launch-live-check',
    title: 'Group launch: live check on a test account',
    render: () => <GroupRunDialog />,
  },
  {
    id: 'watch-it-live',
    title: 'Watch it live',
    render: (address) => {
      const state = address.get('state')
      if (state === 'problem') return <Watch run={liveCheckWatchRun('problem')} noteOpen={false} />
      if (state === 'no-passes-left') {
        return <Watch run={LIVE_CHECK_WATCH_SPENT_RUN} noteOpen={false} />
      }
      return <Watch run={liveCheckWatchRun('ready')} noteOpen={state === 'send-note'} />
    },
  },
  {
    id: 'note-used-for',
    title: 'Project note: Used for',
    render: (address) => <NoteForm state={address.get('state') ?? 'new'} />,
  },
]
