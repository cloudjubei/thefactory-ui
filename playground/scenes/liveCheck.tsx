import { useEffect, useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { ProcessRun } from 'thefactory-tools/types'
import { processStepStates } from 'thefactory-tools/utils'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  ProjectsProvider,
  changeLiveCheckDraft,
  launchFeatureRows,
  launchProofPlanRows,
  processProposalView,
  proofPlanMetadata,
  setLaunchLiveCheck,
  setLaunchProofNotes,
  toggleLaunchProofKind,
  type LaunchProofPlanEdits,
  launchLiveCheckView,
  parkNoteCopy,
  parkNoteRequired,
  storyLaunchGrant,
  useProjects,
  type DependencyResolution,
  type LiveCheckDraft,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import { GroupStoryRunDialog } from 'thefactory-ui/web'
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import LaunchFeatureList from '../../src/web/compound/chat/LaunchFeatureList'
import LaunchLiveCheckRow from '../../src/web/compound/chat/LaunchLiveCheckRow'
import ParkNoteComposer from '../../src/web/compound/process/ParkNoteComposer'
import { ParkBlock, PipelineNode } from '../../src/web/compound/process/ProcessPipeline'
import ProjectNotesForm from '../../src/web/compound/settings/ProjectNotesForm'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import type { Scene } from '../showcase/types'
import {
  LIVE_CHECK_NOTE_ROUTES,
  LIVE_CHECK_OFFERS,
  LIVE_CHECK_OPEN_NOTE,
  LIVE_CHECK_ROW_STATES,
  LIVE_CHECK_STORY_ID,
  LIVE_CHECK_WATCH_DECIDED_RUN,
  LIVE_CHECK_WATCH_SPENT_RUN,
  liveCheckGroupPreview,
  liveCheckLaunchProposal,
  liveCheckLaunchRoutes,
  liveCheckRequiredRun,
  liveCheckWatchRun,
} from './liveCheckFixtures'
import { OnFixtures } from './onFixtures'

const noop = () => {}
const resolved = async () => {}
const handedOn = async () => true
const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const NO_TOKEN = { read: () => null, write: noop }
const NOW = Date.parse('2026-11-12T09:00:00Z')
const unresolved = (id: string): DependencyResolution => ({
  id,
  code: 'STORY_NOT_FOUND',
  message: '',
})

/** Signed out with no backend: each state draws only what it is given. */
function frame(children: ReactNode, width = 720): ReactNode {
  return (
    <AuthProvider storage={NO_TOKEN}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <AppSettingsProvider storage={MEMORY}>
          <ProjectsProvider>
            <FilesProvider>
              <MemoryRouter>
                <div className="bg-(--surface-base) p-4" style={{ maxWidth: width }}>
                  {children}
                </div>
              </MemoryRouter>
            </FilesProvider>
          </ProjectsProvider>
        </AppSettingsProvider>
      </ApiProvider>
    </AuthProvider>
  )
}

/** One feature's "Live check" row, switchable, starting where the state says. */
function Row({ state }: { state: keyof typeof LIVE_CHECK_ROW_STATES }) {
  const start = LIVE_CHECK_ROW_STATES[state]!
  const [draft, setDraft] = useState<LiveCheckDraft>(start.draft)
  return (
    <OnFixtures routes={LIVE_CHECK_NOTE_ROUTES}>
      <MemoryRouter>
        <div className="flex w-full max-w-[560px] flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3">
          <LaunchLiveCheckRow
            view={launchLiveCheckView(LIVE_CHECK_OFFERS[start.offer], draft)}
            projectId={FAKE_PROJECT_ID}
            onChange={(change) => setDraft((prev) => changeLiveCheckDraft(prev, change))}
          />
          <code className="text-[11px] text-(--text-muted)">Draft: {JSON.stringify(draft)}</code>
        </div>
      </MemoryRouter>
    </OnFixtures>
  )
}

function InProject({ children }: { children: ReactNode }) {
  const { setActiveProjectId } = useProjects()
  useEffect(() => setActiveProjectId(FAKE_PROJECT_ID), [setActiveProjectId])
  return children
}

/** The card's feature list on the fixture preview, as the card draws it; what it would send shows under it. */
function Features({ offer }: { offer?: keyof typeof LIVE_CHECK_OFFERS }) {
  const proposal = liveCheckLaunchProposal(offer)
  const [edits, setEdits] = useState<LaunchProofPlanEdits>({})
  const rows = launchFeatureRows(
    processProposalView(proposal),
    launchProofPlanRows(proposal, edits),
  )
  return (
    <OnFixtures routes={LIVE_CHECK_NOTE_ROUTES}>
      <MemoryRouter>
        <div className="flex w-full max-w-[640px] flex-col gap-2 bg-(--surface-raised) p-3">
          <LaunchFeatureList
            storyId={LIVE_CHECK_STORY_ID}
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
          <code className="text-[11px] text-(--text-muted)">
            Sends: {JSON.stringify(proofPlanMetadata(proposal, edits, false)?.proofPlans ?? null)}
          </code>
        </div>
      </MemoryRouter>
    </OnFixtures>
  )
}

/** The real launch card on a fixture preview; Start run shows the plans it sent. */
function LaunchCard({ offer }: { offer?: keyof typeof LIVE_CHECK_OFFERS }) {
  const [sent, setSent] = useState<string>()
  return (
    <OnFixtures routes={liveCheckLaunchRoutes(offer)}>
      <FilesProvider>
        <MemoryRouter>
          <InProject>
            <div className="flex w-full max-w-[640px] flex-col gap-2">
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
              {sent !== undefined ? (
                <code className="px-3 text-[11px] text-(--text-muted)">
                  Sent proofPlans: {sent}
                </code>
              ) : null}
            </div>
          </InProject>
        </MemoryRouter>
      </FilesProvider>
    </OnFixtures>
  )
}

/** The group story's Run dialog; Start says what it sent of the live checks. */
function GroupRunDialog() {
  return (
    <OnFixtures routes={LIVE_CHECK_NOTE_ROUTES}>
      <MemoryRouter>
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
      </MemoryRouter>
    </OnFixtures>
  )
}

function park(run: ProcessRun): ReactNode {
  return frame(
    <ParkBlock
      run={run}
      managerLine={undefined}
      onChoose={noop}
      onChangeProof={noop}
      onAnswerRequest={noop}
      onDelegate={handedOn}
      onDrill={noop}
    />,
  )
}

function Rows({ run }: { run: ProcessRun }) {
  return frame(
    <ol className="m-0 flex list-none flex-col rounded-xl border border-(--border-subtle) bg-(--surface-raised) p-0 py-1.5">
      {processStepStates(run).map((state) => (
        <PipelineNode
          key={state.step.id}
          run={run}
          state={state}
          now={NOW}
          stopHolder={undefined}
          managerLine={undefined}
          addedTag={undefined}
          resolveDependency={unresolved}
          onDrill={noop}
          onOpenPanel={noop}
        />
      ))}
    </ol>,
    820,
  )
}

const ROW_CHOICES = [
  { id: 'off', label: 'Off' },
  { id: 'required', label: 'Required' },
  { id: 'ask-me', label: 'Ask me' },
  { id: 'before-and-after', label: 'Before and after' },
  { id: 'secret-hint', label: 'Open logins note' },
  { id: 'ask-first-note', label: 'Logins note asks first' },
]

export const LIVE_CHECK_SCENES: Scene[] = [
  {
    id: 'launch-live-check',
    title: 'Launch: live check on a test account',
    component: 'LaunchLiveCheckRow · LaunchFeatureList · ApprovalPanel (startFeatureWork)',
    group: 'Process',
    description:
      'Only for a project with an app or web page to sign in to, test accounts in its notes, and a change that shows on screen: the preview then offers a live check per feature, and every other feature shows nothing. The row is always optional. Off, Required (an agent signs in and checks it) or Ask me (a device is set up and signed in, and you say if it looks right), starting at what the agent advises — Off when it advises none — with its advice under the switch. “Before and after” shows only while a mode is on and starts off: only the after is checked by default. When the logins sit in an open note, a hint asks to make it a secret and opens that note — its label only, never its text. When they sit in a note that asks first, one line says picking a check lets this run use the test logins: the launch clears that note for the run. On the card the row lives in the feature’s proof editor; collapsed, a “Live check: …” chip says the choice and opens it. The chosen mode is placed on the feature’s steps before Report.',
    states: [
      {
        id: 'off',
        title: 'Off: nothing advised',
        description: 'The agent advises neither mode: the row starts off, with no toggle.',
        render: () => <Row state="off" />,
      },
      {
        id: 'required',
        title: 'Required: advised',
        description:
          'Proved on fake data and the work names real services: the agent advises required.',
        render: () => <Row state="required" />,
      },
      {
        id: 'ask-me',
        title: 'Ask me: advised',
        description:
          'A device here can be watched: the agent advises ask me. Before and after starts off.',
        render: () => <Row state="ask-me" />,
      },
      {
        id: 'before-and-after',
        title: 'Before and after on',
        description: 'The base build is walked first, then the change.',
        render: () => <Row state="before-and-after" />,
      },
      {
        id: 'secret-hint',
        title: 'Logins in an open note',
        description:
          'The hint asks to make the note a secret; the chip opens the note, by label only.',
        render: () => <Row state="secret-hint" />,
      },
      {
        id: 'ask-first-note',
        title: 'Logins in a note that asks first',
        description:
          'A line under the row says picking a check lets this run use the test logins: choosing one on the card clears that note for the run, so it never stops to ask.',
        render: () => <Row state="ask-first-note" />,
      },
      {
        id: 'card',
        title: 'Features on the card: chip on the offered feature',
        description:
          '“Reply in thread” is offered a live check (ask me advised); “Read receipts” is not and shows no chip. The chip opens the proof editor with the row; Show steps puts “Watch it live” before Report. The line under it is what Start would send.',
        render: () => <Features offer="ask-me" />,
      },
      {
        id: 'whole-card',
        title: 'The whole launch card',
        description: 'The same preview in the agent’s launch card; scroll to the features.',
        render: () => <LaunchCard offer="ask-me" />,
      },
      {
        id: 'not-offered',
        title: 'Not offered',
        description: 'No feature is offered a live check: no chip, no row, nothing sent.',
        render: () => <Features />,
      },
    ],
    controls: [
      { id: 'start', label: 'Start', kind: 'choice', options: ROW_CHOICES, default: 'off' },
    ],
    presets: ROW_CHOICES.map(({ id, label }) => ({ id, name: label, values: { start: id } })),
    play: (values) => {
      const state = values.start && values.start in LIVE_CHECK_ROW_STATES ? values.start : 'off'
      return <Row key={state} state={state} />
    },
  },
  {
    id: 'group-launch-live-check',
    title: 'Group launch: live check on a test account',
    component:
      'GroupStoryRunDialog · GroupWorkLaunchPanel · GroupLegLiveChecks · LaunchLiveCheckRow',
    group: 'Process',
    description:
      'A group launch shows the same row under each part, once per feature its preview offers a live check, named by the feature. A part offered none shows nothing. Start sends the checks switched on, by project and feature; one left off is not sent.',
    states: [
      {
        id: 'dialog',
        title: 'Run dialog: two features offered on one part',
        description:
          'Overseer Web offers “Read ticks” (ask me advised) and “Read receipts setting” (nothing advised); TheFactory Backend none.',
        overlay: true,
        render: () => <GroupRunDialog />,
      },
    ],
  },
  {
    id: 'watch-it-live',
    title: 'Watch it live',
    component: 'ParkBlock (ProcessPipeline) · LiveCheckWatchHeader · ParkNoteComposer',
    group: 'Process',
    description:
      'An ask-me live check stops the run at “Watch it live”, after the proof and before Report. It is not a sign-off: no review page, just the stop. Its card shows whether the device is set up, the host’s own line, and what to walk. Answers: “Looks right” carries on; “Set it up again” prepares the device again; “Send to the developer” opens the note composer — the note is required — and is offered only while passes back are left; “Stop here” asks first and the run can be revived.',
    states: [
      {
        id: 'ready',
        title: 'Device ready',
        description: 'The host booted the emulator with a window, opened the build and signed in.',
        render: () => park(liveCheckWatchRun('ready')),
      },
      {
        id: 'problem',
        title: 'Device not set up',
        description: 'The host could not set the device up: its line says why.',
        render: () => park(liveCheckWatchRun('problem')),
      },
      {
        id: 'no-passes-left',
        title: 'Nothing left to send it back',
        description:
          'When the run gives no pass back to the developer, “Send to the developer” is gone and the card says why. Today the engine counts no limit on a gate’s loop, so this shows only when the process has no loop back.',
        render: () => park(LIVE_CHECK_WATCH_SPENT_RUN),
      },
      {
        id: 'send-note',
        title: 'Send to the developer: what did you see?',
        description: 'The note is required: Send stays off while it is blank.',
        render: () =>
          frame(
            <ParkNoteComposer
              copy={parkNoteCopy('send-to-developer', { noteRequired: true }, true)}
              required={parkNoteRequired('send-to-developer', { noteRequired: true })}
              onSend={noop}
              onCancel={noop}
            />,
          ),
      },
    ],
  },
  {
    id: 'live-check-step',
    title: 'Live check step on the run',
    component: 'PipelineNode (ProcessPipeline)',
    group: 'Process',
    description:
      'A required live check is an agent step, “Live check”, after Verify and before Report, like the other verifier steps; its row says the verdict it filed. A watched one shows “Watch it live” with the person’s answer.',
    states: [
      {
        id: 'approved',
        title: 'Required: approved',
        description: 'The agent signed in and the change worked.',
        render: () => <Rows run={liveCheckRequiredRun('approved')} />,
      },
      {
        id: 'changes-requested',
        title: 'Required: changes requested',
        description: 'The verdict and what the agent saw; the work goes back to the developer.',
        render: () => <Rows run={liveCheckRequiredRun('changes-requested')} />,
      },
      {
        id: 'watched',
        title: 'Ask me: looks right',
        description: 'The watch passed by the person.',
        render: () => <Rows run={LIVE_CHECK_WATCH_DECIDED_RUN} />,
      },
    ],
  },
  {
    id: 'note-used-for',
    title: 'Project note: Used for',
    component: 'ProjectNotesForm · NotesSettings',
    group: 'Project',
    description:
      'A note says what the host uses it for: None, Test accounts (the logins a live check signs in with) or Testing device (the emulator it runs on). A secret’s value is never shown, and an open note holding test logins is not shown either.',
    states: [
      {
        id: 'new',
        title: 'New note: None',
        description: 'Every new note starts with no purpose.',
        render: () =>
          frame(
            <ProjectNotesForm mode={{ kind: 'create', onSubmit: resolved }} onClose={noop} />,
            560,
          ),
      },
      {
        id: 'test-accounts',
        title: 'Editing the open logins note',
        description:
          'Marked as test accounts; the value field is empty and the stored text never shown.',
        render: () =>
          frame(
            <ProjectNotesForm
              mode={{ kind: 'edit', note: LIVE_CHECK_OPEN_NOTE, onSubmit: resolved }}
              onClose={noop}
            />,
            560,
          ),
      },
    ],
  },
]
