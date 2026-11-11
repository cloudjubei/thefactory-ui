import type { ProcessDefinition } from 'thefactory-tools/types'

const steps = (...names: string[]): ProcessDefinition['steps'] =>
  names.map((name, at) => ({
    id: `step-${at + 1}`,
    name,
    kind: at === names.length - 1 ? 'gate' : 'agent',
    ...(at === names.length - 1 ? {} : { agentType: 'developer' }),
  }))

const definition = (
  id: string,
  name: string,
  over: Partial<ProcessDefinition>,
  ...stepNames: string[]
): ProcessDefinition => ({
  id,
  name,
  description: '',
  steps: steps(...stepNames),
  loops: [],
  version: 1,
  updatedAt: 0,
  ...over,
})

/**
 * A process library as one project in a group reads it: a shared process, a
 * group's own, a group copy over a shared one, a project's own, a project copy
 * over a shared one, and a project copy over the group's.
 */
export const FAKE_PROCESS_LIBRARY: ProcessDefinition[] = [
  definition('story', 'Story', { scope: 'global', seeded: true }, 'Build', 'Review', 'Sign-off'),
  definition('release', 'Release', { scope: 'group' }, 'Build', 'Publish', 'Sign-off'),
  definition(
    'feature',
    'Feature',
    { scope: 'group', shadowsGlobal: true, version: 3 },
    'Plan',
    'Build',
    'Sign-off',
  ),
  definition('docs', 'Docs pass', { scope: 'project' }, 'Write', 'Sign-off'),
  definition(
    'bug-fix',
    'Bug fix',
    { scope: 'project', shadowsGlobal: true, version: 2 },
    'Fix',
    'Sign-off',
  ),
  definition(
    'hotfix',
    'Hotfix',
    { scope: 'project', shadowsGroup: true, shadowsGlobal: true, version: 4 },
    'Fix',
    'Publish',
    'Sign-off',
  ),
]
