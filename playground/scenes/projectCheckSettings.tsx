import { useState, type ReactNode } from 'react'
import type { ProjectCheckCommandsSetting, ProjectGeneratorSetting } from 'thefactory-tools/types'
// Not on the package's public surface: the project editor and the sign-off review draw them
// themselves. The showcase reaches into the source for them.
import ProcessCheckList from '../../src/web/compound/process/ProcessCheckList'
import ProjectGeneratorsList from '../../src/web/compound/process/ProjectGeneratorsList'
import ProjectCheckCommandsField from '../../src/web/compound/projects/ProjectCheckCommandsField'
import ProjectGeneratorsField from '../../src/web/compound/projects/ProjectGeneratorsField'
import type { Scene } from '../showcase/types'
import {
  CHECK_COMMANDS_STATES,
  CHECK_SCOPE_STATES,
  CHECKS_SCOPE_NOW,
  GENERATOR_STATES,
  LISTED_GENERATORS,
} from './projectCheckSettingsFixtures'

const CHECK_STEP = { kind: 'check' as const }

function frame(children: ReactNode, phone = false): ReactNode {
  return (
    <div
      className={`${phone ? 'w-[375px]' : 'w-[560px]'} max-w-full rounded-md border border-(--border-subtle) bg-(--surface-base) p-4`}
    >
      {children}
    </div>
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

export const PROJECT_CHECK_SETTINGS_SCENES: Scene[] = [
  {
    id: 'project-check-commands',
    title: 'Check commands',
    component: 'ProjectCheckCommandsField',
    group: 'Settings',
    description:
      'In the project editor, after the check environment: the command that runs the unit tests related to some files, which a feature’s checks run in place of the whole suite, and the command that fixes what the format check finds. Each left empty keeps what the checks detect. The field says why a command cannot be saved, as the backend would refuse it, and Save scrolls to it.',
    states: [
      {
        id: 'empty',
        title: 'Nothing set',
        description: 'Both empty: the checks use what they detect.',
        render: () => frame(<Commands start={CHECK_COMMANDS_STATES.empty} />),
      },
      {
        id: 'filled',
        title: 'Both set',
        description: 'A related-tests command with {files} where the files go, and a format fix.',
        render: () => frame(<Commands start={CHECK_COMMANDS_STATES.filled} />),
      },
      {
        id: 'invalid',
        title: 'Related tests without {files}',
        description:
          'The related-tests command does not say where the files go: it cannot be saved.',
        render: () => frame(<Commands start={CHECK_COMMANDS_STATES.invalid} />),
      },
      {
        id: 'phone',
        title: 'On a phone',
        description: 'Both set, at a phone’s width.',
        render: () => frame(<Commands start={CHECK_COMMANDS_STATES.filled} />, true),
      },
    ],
  },
  {
    id: 'project-generators',
    title: 'Generators',
    component: 'ProjectGeneratorsField',
    group: 'Settings',
    description:
      'In the project editor, after the check commands: the commands that write the project’s generated sources. Each has a name, a one-line command, what it reads — a path, or another project’s file, picked by project and its path there, with where the command reads it — and what it writes. Each says why it cannot be saved, as the backend would refuse it, and Save scrolls to it.',
    states: [
      {
        id: 'empty',
        title: 'None',
        description: 'No generators, and Add generator.',
        render: () => frame(<Generators start={GENERATOR_STATES.empty} />),
      },
      {
        id: 'another-project',
        title: 'Reads another project’s file',
        description:
          'The API client, built from the backend’s swagger.json: the backend picked, the path in it, and where the command reads it.',
        render: () => frame(<Generators start={GENERATOR_STATES['another-project']} />),
      },
      {
        id: 'two',
        title: 'Two generators',
        description: 'The API client and one that reads a path of the project itself.',
        render: () => frame(<Generators start={GENERATOR_STATES.two} />),
      },
      {
        id: 'invalid',
        title: 'Cannot be saved',
        description:
          'A two-line command, an empty input and nothing written: each reason under the generator.',
        render: () => frame(<Generators start={GENERATOR_STATES.invalid} />),
      },
      {
        id: 'phone',
        title: 'On a phone',
        description: 'Two generators at a phone’s width: the project and its path stack.',
        render: () => frame(<Generators start={GENERATOR_STATES.two} />, true),
      },
    ],
  },
  {
    id: 'process-check-scope',
    title: 'Checks: which tests ran',
    component: 'ProcessCheckList',
    group: 'Process',
    description:
      'A checks step’s unit tests say which ran: the tests related to the files the change touched, inside a feature, or the whole suite — at the story’s own checks, after the base came in, or when the related tests could not be picked, with why on hover. A step that formatted the change says which files, and the commit.',
    states: [
      {
        id: 'related',
        title: 'Related tests',
        description: 'A feature’s checks ran the tests related to its files: “related tests”.',
        render: () =>
          frame(
            <ProcessCheckList
              step={CHECK_STEP}
              latest={CHECK_SCOPE_STATES.related}
              now={CHECKS_SCOPE_NOW}
            />,
          ),
      },
      {
        id: 'whole-suite',
        title: 'Whole suite',
        description: 'The story’s own checks ran the whole unit suite: “whole suite”.',
        render: () =>
          frame(
            <ProcessCheckList
              step={CHECK_STEP}
              latest={CHECK_SCOPE_STATES['whole-suite']}
              now={CHECKS_SCOPE_NOW}
            />,
          ),
      },
      {
        id: 'whole-suite-because',
        title: 'Whole suite, and why',
        description:
          'The related tests were asked for and the whole suite ran: the chip says why on hover.',
        render: () =>
          frame(
            <ProcessCheckList
              step={CHECK_STEP}
              latest={CHECK_SCOPE_STATES['whole-suite-because']}
              now={CHECKS_SCOPE_NOW}
            />,
          ),
      },
      {
        id: 'formatted',
        title: 'Formatted the change',
        description:
          'The format check failed, the format fix ran on the change’s files and committed them with the work: the line under the checks names them and the commit.',
        render: () =>
          frame(
            <ProcessCheckList
              step={CHECK_STEP}
              latest={CHECK_SCOPE_STATES.formatted}
              now={CHECKS_SCOPE_NOW}
            />,
          ),
      },
      {
        id: 'phone',
        title: 'On a phone',
        description: 'Formatted, with the related tests, at a phone’s width.',
        render: () =>
          frame(
            <ProcessCheckList
              step={CHECK_STEP}
              latest={CHECK_SCOPE_STATES.formatted}
              now={CHECKS_SCOPE_NOW}
            />,
            true,
          ),
      },
    ],
  },
  {
    id: 'project-generators-listing',
    title: 'Generators on the checks',
    component: 'ProjectGeneratorsList',
    group: 'Process',
    description:
      'Under the build of a story’s sign-off: the generators the project declares, as its checks return them — each name, command, what it reads and what it writes.',
    states: [
      {
        id: 'two',
        title: 'Two generators',
        description: 'The API client from the backend’s swagger.json, and the tool schemas.',
        render: () => frame(<ProjectGeneratorsList generators={LISTED_GENERATORS} />),
      },
      {
        id: 'phone',
        title: 'On a phone',
        description: 'The same at a phone’s width.',
        render: () => frame(<ProjectGeneratorsList generators={LISTED_GENERATORS} />, true),
      },
    ],
  },
]
