import { useRef, useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { GroupConstellationLayout, GroupHomeLayout } from 'thefactory-ui/headless'
import GroupHomeConnected from '../../src/native/compound/GroupHomeConnected'
import ProjectDefaultCapsField from '../../src/native/compound/projects/ProjectDefaultCapsField'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { IconSave } from '../../src/native/icons'
import { Button } from '../../src/native/primitives/Button'
import Field from '../../src/native/primitives/Field'
import { Input } from '../../src/native/primitives/Input'
import { FAKE_GROUP_ID, MEMBERS } from '../../src/fakeBackend/fixtures/projects'
import { FAKE_GROUP_STATUS_AT } from '../../src/fakeBackend/fixtures/projectsGroups'
import { OnFixtures } from '../scenes/onFixtures'

const noop = () => {}
const AT = Date.parse(FAKE_GROUP_STATUS_AT)
const PROJECTS = MEMBERS.map(({ id, title }) => ({ id, title }))

/** A native panel at its address: `?view=<id>`, on the same fixtures as the showcase. */
export type NativeView = {
  id: string
  title: string
  render: (address: URLSearchParams) => ReactNode
}

function Line({ children, testID }: { children: ReactNode; testID: string }) {
  const { theme } = useNativeTheme()
  return (
    <Text testID={testID} style={{ fontSize: 12, padding: 8, color: theme.text.secondary }}>
      {children}
    </Text>
  )
}

/**
 * The project editor's limits with the rest of the form above them and Save below, in a band of
 * its own: mobile's `ProjectManagerModal`, blocking the way it is asked to.
 */
function ProjectLimits() {
  const { theme } = useNativeTheme()
  const [metadata, setMetadata] = useState<Record<string, unknown>>({
    icon: 'folder',
    processDefaultCaps: { spendUsdCap: 10, maxIterations: 2 },
  })
  const [capsError, setCapsError] = useState<string>()
  const [saved, setSaved] = useState('Nothing saved yet')
  const form = useRef<ScrollView>(null)
  const capsAt = useRef(0)
  const save = () => {
    if (capsError) {
      form.current?.scrollTo({ y: capsAt.current })
      return
    }
    setSaved(`Saved: ${JSON.stringify(metadata.processDefaultCaps ?? null)}`)
  }
  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={form} style={{ flex: 1 }}>
        <View style={{ gap: 16, padding: 16 }}>
          <Field label="Title">
            <Input value="TheFactory UI" onChangeText={noop} />
          </Field>
          <Field label="Description">
            <Input value="The shared UI package." onChangeText={noop} />
          </Field>
          <View style={{ height: 720, borderRadius: 8, backgroundColor: theme.surface.muted }} />
          <View onLayout={(event) => (capsAt.current = event.nativeEvent.layout.y)}>
            <ProjectDefaultCapsField
              metadata={metadata}
              onChange={setMetadata}
              onErrorChange={setCapsError}
            />
          </View>
          <View style={{ height: 720, borderRadius: 8, backgroundColor: theme.surface.muted }} />
        </View>
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 12,
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
        }}
      >
        <Line testID="saved">{saved}</Line>
        <Button variant="secondary" size="icon" onPress={save} accessibilityLabel="Save">
          <IconSave size={18} />
        </Button>
      </View>
    </View>
  )
}

export const NATIVE_VIEWS: readonly NativeView[] = [
  {
    id: 'group-home',
    title: 'Group home',
    render: (address) => (
      <OnFixtures>
        <GroupHomeConnected
          groupId={FAKE_GROUP_ID}
          title="Overseer"
          typeTag="MAIN"
          projects={PROJECTS}
          layout={(address.get('layout') ?? 'needs-you-first') as GroupHomeLayout}
          constellationLayout={(address.get('deps') ?? 'layers') as GroupConstellationLayout}
          now={AT}
          onSelectProject={noop}
          onSelectRun={noop}
          onSelectGroupRun={noop}
        />
      </OnFixtures>
    ),
  },
  {
    id: 'project-limits',
    title: 'Project default limits',
    render: () => <ProjectLimits />,
  },
]
