import { useEffect, useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import {
  FilesProvider,
  storyLaunchGrant,
  useProjects,
  type FakeDataInProduct,
} from 'thefactory-ui/headless'
import ApprovalPanel from '../../src/native/compound/chat/ApprovalPanel'
import ProjectFakeDataInProductField from '../../src/native/compound/projects/ProjectFakeDataInProductField'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import {
  FAKE_DATA_STORY_ID,
  fakeDataLaunchRoutes,
  type FakeDataLaunch,
} from '../scenes/fakeDataInProductFixtures'
import { OnFixtures } from '../scenes/onFixtures'
import type { NativeView } from './views'

const noop = () => {}

function InProject({ children }: { children: ReactNode }) {
  const { setActiveProjectId } = useProjects()
  useEffect(() => setActiveProjectId(FAKE_PROJECT_ID), [setActiveProjectId])
  return children
}

function Sent({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <Text testID="sent" style={{ fontSize: 11, paddingHorizontal: 12, color: theme.text.muted }}>
      {children}
    </Text>
  )
}

const LAUNCHES: Record<string, { launch: FakeDataLaunch; start?: FakeDataInProduct }> = {
  ship: { launch: 'setup-added', start: 'ship' },
  'keep-out': { launch: 'setup-added', start: 'keep-out' },
  declared: { launch: 'declared', start: 'keep-out' },
  'not-offered': { launch: 'no-screens' },
}

function LaunchCard({ state }: { state: string }) {
  const { launch, start } = LAUNCHES[state] ?? LAUNCHES.ship!
  const [sent, setSent] = useState<string>()
  return (
    <OnFixtures routes={fakeDataLaunchRoutes(launch, start)}>
      <FilesProvider>
        <InProject>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={{ width: 390, maxWidth: '100%' }}>
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
              {sent !== undefined ? <Sent>Sent fakeDataInProduct: {sent}</Sent> : null}
            </View>
          </ScrollView>
        </InProject>
      </FilesProvider>
    </OnFixtures>
  )
}

function ProjectSetting({ stored }: { stored?: FakeDataInProduct }) {
  const [metadata, setMetadata] = useState<Record<string, unknown>>({
    icon: 'folder',
    ...(stored ? { processFakeDataInProduct: stored } : {}),
  })
  return (
    <View style={{ gap: 12, padding: 16, width: 390, maxWidth: '100%' }}>
      <ProjectFakeDataInProductField metadata={metadata} onChange={setMetadata} />
      <Sent>{JSON.stringify(metadata.processFakeDataInProduct ?? null)}</Sent>
    </View>
  )
}

/**
 * "Fake data in the product" on a phone: the launch card (`?state=ship`, `keep-out`, `declared`
 * or `not-offered`) and the project editor's field (`?state=ship` or `keep-out`).
 */
export const FAKE_DATA_VIEWS: NativeView[] = [
  {
    id: 'launch-fake-data-in-product',
    title: 'Launch: fake data in the product',
    render: (address) => <LaunchCard state={address.get('state') ?? 'ship'} />,
  },
  {
    id: 'project-fake-data-in-product',
    title: 'Project: fake data in the product',
    render: (address) => (
      <ProjectSetting stored={address.get('state') === 'keep-out' ? 'keep-out' : undefined} />
    ),
  },
]
