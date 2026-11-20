import { useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import type { ProjectCheckCommandsSetting, ProjectGeneratorSetting } from 'thefactory-tools/types'
import ProcessCheckList from '../../src/native/compound/process/ProcessCheckList'
import ProjectGeneratorsList from '../../src/native/compound/process/ProjectGeneratorsList'
import ProjectCheckCommandsField from '../../src/native/compound/projects/ProjectCheckCommandsField'
import ProjectGeneratorsField from '../../src/native/compound/projects/ProjectGeneratorsField'
import {
  CHECK_COMMANDS_STATES,
  CHECK_SCOPE_STATES,
  CHECKS_SCOPE_NOW,
  GENERATOR_STATES,
  LISTED_GENERATORS,
} from '../scenes/projectCheckSettingsFixtures'
import type { NativeView } from './views'

const CHECK_STEP = { kind: 'check' as const }

function Phone({ children }: { children: ReactNode }) {
  return (
    <ScrollView>
      <View style={{ width: 390, maxWidth: '100%', padding: 16, gap: 12 }}>{children}</View>
    </ScrollView>
  )
}

function Commands({ start }: { start: ProjectCheckCommandsSetting | undefined }) {
  const [value, setValue] = useState(start)
  return <ProjectCheckCommandsField value={value} onChange={setValue} />
}

function Generators({ start }: { start: ProjectGeneratorSetting[] | undefined }) {
  const [value, setValue] = useState(start)
  return <ProjectGeneratorsField projectId="thefactory-ui" value={value} onChange={setValue} />
}

/**
 * A project's check settings on a phone, the web scenes' states:
 * - ?view=project-check-commands&state=empty|filled|invalid
 * - ?view=project-generators&state=empty|another-project|two|invalid
 * - ?view=process-check-scope&state=related|whole-suite|whole-suite-because|formatted
 * - ?view=project-generators-listing
 */
export const PROJECT_CHECK_SETTINGS_VIEWS: NativeView[] = [
  {
    id: 'project-check-commands',
    title: 'Check commands',
    render: (address) => {
      const state = address.get('state') ?? 'filled'
      return (
        <Phone>
          <Commands key={state} start={CHECK_COMMANDS_STATES[state]} />
        </Phone>
      )
    },
  },
  {
    id: 'project-generators',
    title: 'Generators',
    render: (address) => {
      const state = address.get('state') ?? 'two'
      return (
        <Phone>
          <Generators key={state} start={GENERATOR_STATES[state]} />
        </Phone>
      )
    },
  },
  {
    id: 'process-check-scope',
    title: 'Checks: which tests ran',
    render: (address) => {
      const latest =
        CHECK_SCOPE_STATES[address.get('state') ?? 'formatted'] ?? CHECK_SCOPE_STATES.formatted!
      return (
        <Phone>
          <ProcessCheckList step={CHECK_STEP} latest={latest} now={CHECKS_SCOPE_NOW} />
        </Phone>
      )
    },
  },
  {
    id: 'project-generators-listing',
    title: 'Generators on the checks',
    render: () => (
      <Phone>
        <ProjectGeneratorsList generators={LISTED_GENERATORS} />
      </Phone>
    ),
  },
]
