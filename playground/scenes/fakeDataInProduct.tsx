import { useEffect, useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  FAKE_DATA_IN_PRODUCT_OPTIONS,
  FilesProvider,
  storyLaunchGrant,
  useProjects,
  type FakeDataInProduct,
} from 'thefactory-ui/headless'
import { ProjectFakeDataInProductField } from 'thefactory-ui/web'
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import type { Scene } from '../showcase/types'
import {
  FAKE_DATA_STORY_ID,
  fakeDataLaunchRoutes,
  type FakeDataLaunch,
} from './fakeDataInProductFixtures'
import { OnFixtures } from './onFixtures'

const noop = () => {}

/** Puts the fake project in view, so the story its launch reads loads. */
function InProject({ children }: { children: ReactNode }) {
  const { setActiveProjectId } = useProjects()
  useEffect(() => setActiveProjectId(FAKE_PROJECT_ID), [setActiveProjectId])
  return children
}

/** The real launch card on fixture answers; what Start run sent shows under it. */
function LaunchCard({ launch, start }: { launch: FakeDataLaunch; start?: FakeDataInProduct }) {
  const [sent, setSent] = useState<string>()
  return (
    <OnFixtures routes={fakeDataLaunchRoutes(launch, start)}>
      <FilesProvider>
        <MemoryRouter>
          <InProject>
            <div className="flex w-full max-w-[640px] flex-col gap-2">
              <ApprovalPanel
                grant={storyLaunchGrant({
                  storyId: FAKE_DATA_STORY_ID,
                  chatRunner: 'api',
                  onLaunch: async (metadata) =>
                    setSent(JSON.stringify(metadata.fakeDataInProduct ?? null)),
                  onCancel: noop,
                })}
                projectId={FAKE_PROJECT_ID}
                onDecideLater={noop}
              />
              {sent !== undefined ? (
                <code className="px-3 text-[11px] text-(--text-muted)">
                  Sent fakeDataInProduct: {sent}
                </code>
              ) : null}
            </div>
          </InProject>
        </MemoryRouter>
      </FilesProvider>
    </OnFixtures>
  )
}

/** The project editor's field; the line under it is what is saved on the project. */
function ProjectSetting({ stored }: { stored?: FakeDataInProduct }) {
  const [metadata, setMetadata] = useState<Record<string, unknown>>({
    icon: 'folder',
    ...(stored ? { processFakeDataInProduct: stored } : {}),
  })
  return (
    <div className="flex w-full max-w-[640px] flex-col gap-3 p-4">
      <ProjectFakeDataInProductField metadata={metadata} onChange={setMetadata} />
      <code className="text-[11px] text-(--text-muted)">
        {JSON.stringify(metadata.processFakeDataInProduct ?? null)}
      </code>
    </div>
  )
}

const CHOICES = FAKE_DATA_IN_PRODUCT_OPTIONS.map(({ value, label }) => ({ id: value, label }))

const startOf = (values: Record<string, string>): FakeDataInProduct =>
  values.start === 'keep-out' ? 'keep-out' : 'ship'

export const FAKE_DATA_IN_PRODUCT_SCENES: Scene[] = [
  {
    id: 'launch-fake-data-in-product',
    title: 'Launch: fake data in the product',
    component: 'ApprovalPanel (startFeatureWork) · LaunchFakeDataChoice',
    group: 'Process',
    description:
      'Whether the code that makes the app’s fake data possible ships with the work is the person’s call on every launch. Offered only for work proved on the app’s screens — the setup feature “Fake data for the app” is added, or the project already declares fake data — and placed right under the features, beside that setup feature, as its own small section. Two choices on a switch, the project’s setting picked to start, with one line saying what the picked one does; Start run sends the choice. Work not proved on screens shows no row, and work joining an open run goes in the way that run’s does.',
    states: [
      {
        id: 'ship',
        title: 'Project ships it',
        description:
          'Setup feature added; the project’s setting is Ship it, so the switch starts there.',
        render: () => <LaunchCard launch="setup-added" start="ship" />,
      },
      {
        id: 'keep-out',
        title: 'Project keeps it out',
        description: 'The same launch on a project set to Keep it out.',
        render: () => <LaunchCard launch="setup-added" start="keep-out" />,
      },
      {
        id: 'declared',
        title: 'Project already has fake data',
        description:
          'No setup feature to add: the work is still proved on screens, so the choice is offered.',
        render: () => <LaunchCard launch="declared" start="keep-out" />,
      },
      {
        id: 'not-offered',
        title: 'Work not proved on screens',
        description: 'The preview carries no choice: the card shows no row and sends none.',
        render: () => <LaunchCard launch="no-screens" />,
      },
    ],
    controls: [
      {
        id: 'start',
        label: 'Project setting',
        kind: 'choice',
        options: CHOICES,
        default: 'ship',
      },
    ],
    presets: CHOICES.map(({ id, label }) => ({ id, name: label, values: { start: id } })),
    play: (values) => (
      <LaunchCard key={startOf(values)} launch="setup-added" start={startOf(values)} />
    ),
  },
  {
    id: 'project-fake-data-in-product',
    title: 'Project: fake data in the product',
    component: 'ProjectFakeDataInProductField',
    group: 'Project',
    description:
      'Where every launch’s choice starts, in the project editor under the default run limits: the same two-choice switch and line as the launch card. A project that never set it ships. The line under the field is what is saved on the project.',
    states: [
      {
        id: 'ship',
        title: 'Not set: Ship it',
        description: 'Nothing stored, read as Ship it.',
        render: () => <ProjectSetting />,
      },
      {
        id: 'keep-out',
        title: 'Keep it out',
        description: 'Stored as keep-out.',
        render: () => <ProjectSetting stored="keep-out" />,
      },
    ],
    controls: [
      {
        id: 'stored',
        label: 'Stored',
        kind: 'choice',
        options: CHOICES,
        default: 'ship',
      },
    ],
    play: (values) => {
      const stored = values.stored === 'keep-out' ? 'keep-out' : 'ship'
      return <ProjectSetting key={stored} stored={stored} />
    },
  },
]
