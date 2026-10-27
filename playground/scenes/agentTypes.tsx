import type { ReactNode } from 'react'
import type { ProcessProposal, ResolvedAgentType } from 'thefactory-tools/types'
import {
  agentTypeSlotRows,
  type AgentTypeSettingsData,
  type AgentTypeSlotPicks,
} from 'thefactory-ui/headless'
import { AgentTypeSettingsPanel, AgentTypeSlotChooser } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'

const noop = () => {}
const kept = async () => true

const column = (node: ReactNode) => <div className="w-[420px] max-w-full">{node}</div>
const page = (node: ReactNode) => <div className="w-[720px] max-w-full p-4">{node}</div>

const builtin = (role: ResolvedAgentType['baseRole']): ResolvedAgentType => ({
  id: role,
  label: role,
  scope: 'builtin',
  baseRole: role,
  contextDocs: [],
})

const SCREEN_CHECKER: ResolvedAgentType = {
  id: 'screen-checker',
  label: 'Screen checker',
  description: 'Proves the change on a booted device, before and after.',
  scope: 'project',
  baseRole: 'verifier',
  brief: 'Capture the hot-seat handover on both orientations.',
  contextDocs: ['docs/TESTING.md'],
}

const CODE_QUALITY: ResolvedAgentType = {
  id: 'code-quality-maintainer',
  label: 'Code quality maintainer',
  description: "Reads the diff against the project's code standard.",
  scope: 'project',
  baseRole: 'verifier',
  brief: 'Read the diff against docs/CODE_STANDARD.md and file one report.',
  briefMode: 'replace',
  proves: false,
  tools: ['readPaths', 'gitDiff', 'getBranchDiffSummary', 'recordReviewEvidence'],
  contextDocs: ['docs/CODE_STANDARD.md', 'docs/FILE_ORGANISATION.md'],
}

const WEB_BUILDER: ResolvedAgentType = {
  id: 'web-builder',
  label: 'Web builder',
  description: 'A developer that follows the group’s web conventions.',
  scope: 'group',
  baseRole: 'developer',
  contextDocs: ['docs/WEB.md'],
}

const GROUP_CHECKER: ResolvedAgentType = {
  id: 'group-checker',
  label: 'Group checker',
  scope: 'group',
  baseRole: 'verifier',
  contextDocs: [],
}

const BUILTINS = (['developer', 'developer-verifier', 'verifier', 'fixer'] as const).map(builtin)
const OPTIONS = [...BUILTINS, SCREEN_CHECKER, CODE_QUALITY, WEB_BUILDER, GROUP_CHECKER]

/** A launch proposal offering the project's and the group's types, each slot proposed as named. */
function proposal(
  verifier: { agentTypeId?: string; source: 'launch' | 'project' | 'group' | 'builtin' },
  implementer: { agentTypeId?: string; source: 'launch' | 'project' | 'group' | 'builtin' } = {
    source: 'builtin',
  },
): ProcessProposal {
  return {
    processId: 'story-default',
    name: 'Story',
    steps: [
      {
        id: 'features:f1',
        name: 'Hot-seat turn handover',
        kind: 'process',
        agent: false,
        children: [
          { id: 'implement', name: 'Implement', kind: 'agent', agent: true, slot: 'implementer' },
          { id: 'verify', name: 'Verify', kind: 'agent', agent: true, slot: 'verifier' },
        ],
      },
    ],
    agentTypes: OPTIONS.map(({ id, label, description, scope, baseRole, proves }) => ({
      id,
      label,
      ...(description ? { description } : {}),
      scope,
      baseRole,
      ...(proves === false ? { proves } : {}),
    })),
    agentTypeSlots: [
      { slot: 'implementer', ...implementer, options: ['developer', 'web-builder'] },
      {
        slot: 'verifier',
        ...verifier,
        options: ['verifier', 'screen-checker', 'group-checker'],
      },
    ],
  }
}

function Slots({ offer, picks = {} }: { offer: ProcessProposal; picks?: AgentTypeSlotPicks }) {
  return column(
    <div className="flex flex-wrap items-center gap-2">
      {agentTypeSlotRows(offer, picks).map((row) => (
        <AgentTypeSlotChooser key={row.slot} row={row} onChoose={noop} />
      ))}
    </div>,
  )
}

const PROJECT_DATA: AgentTypeSettingsData = {
  agentTypes: [...BUILTINS, CODE_QUALITY, SCREEN_CHECKER, WEB_BUILDER, GROUP_CHECKER],
  slotDefaults: { implementer: 'web-builder', verifier: 'screen-checker' },
  ownSlotDefaults: { verifier: 'screen-checker' },
  groupSlotDefaults: { implementer: 'web-builder', verifier: 'group-checker' },
  groupId: 'web-team',
}

const GROUP_DATA: AgentTypeSettingsData = {
  agentTypes: [...BUILTINS, WEB_BUILDER, GROUP_CHECKER],
  slotDefaults: { implementer: 'web-builder', verifier: 'group-checker' },
}

const EMPTY_PROJECT: AgentTypeSettingsData = {
  agentTypes: BUILTINS,
  slotDefaults: {},
  ownSlotDefaults: {},
  groupSlotDefaults: {},
}

function Settings({
  data,
  kind = 'project',
  edit,
  error = null,
}: {
  data: AgentTypeSettingsData
  kind?: 'project' | 'group'
  edit?: string
  error?: string | null
}) {
  return page(
    <AgentTypeSettingsPanel
      owner={kind === 'project' ? { kind, projectId: 'wargames' } : { kind, groupId: 'web-team' }}
      data={data}
      error={error}
      busy={false}
      onSave={kept}
      onRemove={kept}
      onSaveSlots={kept}
      {...(edit ? { initialEditId: edit } : {})}
    />,
  )
}

export const AGENT_TYPE_SCENES: Scene[] = [
  {
    id: 'agent-type-slots',
    title: 'Launch card — agent per slot',
    component: 'AgentTypeSlotChooser',
    group: 'Process',
    description:
      'On the startFeatureWork card, one chip per process slot names the agent type it runs and where that came from — the agent’s proposal, the project’s default, the group’s, or the built-in. It opens every type of the matching role; the pick is sent with the approval and frozen on the run.',
    states: [
      {
        id: 'project-default',
        title: 'Project default',
        description: 'The project keeps its own verifier type: the Verifier chip starts on it.',
        render: () => (
          <Slots offer={proposal({ agentTypeId: 'screen-checker', source: 'project' })} />
        ),
      },
      {
        id: 'group-default',
        title: 'Group default',
        description:
          'Paired with Project default: the project sets none, so both slots start on its group’s types.',
        render: () => (
          <Slots
            offer={proposal(
              { agentTypeId: 'group-checker', source: 'group' },
              { agentTypeId: 'web-builder', source: 'group' },
            )}
          />
        ),
      },
      {
        id: 'proposed',
        title: 'Proposed by the agent',
        description:
          'The chat agent asked for a type: the chip says so, and the person can change it.',
        render: () => (
          <Slots offer={proposal({ agentTypeId: 'group-checker', source: 'launch' })} />
        ),
      },
      {
        id: 'picked',
        title: 'Changed on the card',
        description:
          'Paired with Project default: the person picked the built-in verifier instead — the chip says Your pick.',
        render: () => (
          <Slots
            offer={proposal({ agentTypeId: 'screen-checker', source: 'project' })}
            picks={{ verifier: 'verifier' }}
          />
        ),
      },
      {
        id: 'built-in',
        title: 'Built-in',
        description:
          'Neither the project nor its group sets a default: each slot runs the built-in role.',
        render: () => <Slots offer={proposal({ source: 'builtin' })} />,
      },
    ],
  },
  {
    id: 'agent-type-settings',
    title: 'Agent types',
    component: 'AgentTypeSettingsPanel',
    group: 'Settings',
    kind: 'screen',
    description:
      'Settings › Project (or Group): the slot defaults a launch starts from, the types the owner keeps — opened to edit, deleted from the editor after a confirm — and, for a project, the types its group gives it.',
    states: [
      {
        id: 'project',
        title: 'Project',
        description:
          'The project sets its verifier and inherits its implementer from the group; it keeps two types of its own.',
        render: () => <Settings data={PROJECT_DATA} />,
      },
      {
        id: 'group',
        title: 'Group',
        description:
          'Paired with Project: the group’s own types and the defaults its projects inherit.',
        render: () => <Settings data={GROUP_DATA} kind="group" />,
      },
      {
        id: 'empty',
        title: 'No types yet',
        description: 'Paired with Project: a project with no group and no types of its own.',
        render: () => <Settings data={EMPTY_PROJECT} />,
      },
      {
        id: 'editing',
        title: 'Editing a type',
        description:
          'A reviewer that replaces the verifier’s brief, narrows its tools and does not prove.',
        overlay: true,
        render: () => <Settings data={PROJECT_DATA} edit="code-quality-maintainer" />,
      },
      {
        id: 'refused',
        title: 'Save refused',
        description:
          'Paired with Editing a type: the backend refused a tool the verifier role is never given, in its words.',
        overlay: true,
        render: () => (
          <Settings
            data={PROJECT_DATA}
            edit="code-quality-maintainer"
            error="A verifier type can only narrow its role's tools: writeFile is not a verifier's."
          />
        ),
      },
    ],
  },
]
