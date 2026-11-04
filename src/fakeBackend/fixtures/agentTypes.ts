import type {
  ListGroupAgentTypesResponse,
  ListProjectAgentTypesResponse,
  ResolvedAgentType,
} from '../../headless/api/generated/types.gen'

export const builtin = (role: ResolvedAgentType['baseRole']): ResolvedAgentType => ({
  id: role,
  label: role,
  scope: 'builtin',
  baseRole: role,
  contextDocs: [],
})

export const SCREEN_CHECKER: ResolvedAgentType = {
  id: 'screen-checker',
  label: 'Screen checker',
  description: 'Proves the change on a booted device, before and after.',
  scope: 'project',
  baseRole: 'verifier',
  brief: 'Capture the hot-seat handover on both orientations.',
  contextDocs: ['docs/TESTING.md'],
}

export const CODE_QUALITY: ResolvedAgentType = {
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

export const WEB_BUILDER: ResolvedAgentType = {
  id: 'web-builder',
  label: 'Web builder',
  description: 'A developer that follows the group’s web conventions.',
  scope: 'group',
  baseRole: 'developer',
  contextDocs: ['docs/WEB.md'],
}

export const GROUP_CHECKER: ResolvedAgentType = {
  id: 'group-checker',
  label: 'Group checker',
  scope: 'group',
  baseRole: 'verifier',
  contextDocs: [],
}

export const BUILTINS = (['developer', 'developer-verifier', 'verifier', 'fixer'] as const).map(
  builtin,
)

export const PROJECT_DATA: ListProjectAgentTypesResponse = {
  agentTypes: [...BUILTINS, CODE_QUALITY, SCREEN_CHECKER, WEB_BUILDER, GROUP_CHECKER],
  slotDefaults: { implementer: 'web-builder', verifier: 'screen-checker' },
  ownSlotDefaults: { verifier: 'screen-checker' },
  groupSlotDefaults: { implementer: 'web-builder', verifier: 'group-checker' },
  groupId: 'web-team',
}

export const GROUP_DATA: ListGroupAgentTypesResponse = {
  agentTypes: [...BUILTINS, WEB_BUILDER, GROUP_CHECKER],
  slotDefaults: { implementer: 'web-builder', verifier: 'group-checker' },
}
