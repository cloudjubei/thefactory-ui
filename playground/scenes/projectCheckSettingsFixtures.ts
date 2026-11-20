import type {
  ProcessLedgerEntry,
  ProjectCheckCommandsSetting,
  ProjectGeneratorSetting,
} from 'thefactory-tools/types'

/**
 * A project's check settings and what its checks show of them, fixed: the
 * check commands, the generators, and a checks step that ran the related
 * tests or the whole suite and formatted the change.
 *
 * Web, no login: /?scene=project-check-commands | project-generators |
 * process-check-scope | project-generators-listing, each with &state=<id>.
 * Native: ?view=project-check-settings&state=<id>, the same ids.
 */
export const CHECK_COMMANDS_STATES: Record<string, ProjectCheckCommandsSetting | undefined> = {
  empty: undefined,
  filled: { relatedTests: 'npx vitest related --run {files}', formatFix: 'npx prettier --write' },
  invalid: { relatedTests: 'npx vitest related --run', formatFix: 'npx prettier --write' },
}

const API_CLIENT: ProjectGeneratorSetting = {
  name: 'API client',
  command: 'npm run generate:backend',
  inputs: [
    {
      path: '../thefactory-backend/swagger/swagger.json',
      from: { projectId: 'thefactory-backend', path: 'swagger/swagger.json' },
    },
  ],
  outputs: ['src/headless/api/generated'],
}

const SCHEMAS: ProjectGeneratorSetting = {
  name: 'Tool schemas',
  command: 'npm run generate:schemas',
  inputs: [{ path: 'src/tools/toolTypes.ts' }],
  outputs: ['src/generated/toolSchemas.ts'],
}

export const GENERATOR_STATES: Record<string, ProjectGeneratorSetting[] | undefined> = {
  empty: undefined,
  'another-project': [API_CLIENT],
  two: [API_CLIENT, SCHEMAS],
  invalid: [
    { name: 'Spec', command: 'npm run spec\nnpm run lint', inputs: [{ path: '' }], outputs: [] },
  ],
}

export const LISTED_GENERATORS: ProjectGeneratorSetting[] = [API_CLIENT, SCHEMAS]

const NOW = 1_760_000_000_000

function checksAttempt(over: Partial<ProcessLedgerEntry>): ProcessLedgerEntry {
  return {
    id: 'checks-1',
    stepId: 'checks',
    iteration: 1,
    status: 'done',
    outcome: 'passed',
    startedAt: NOW - 95_000,
    endedAt: NOW,
    ...over,
  }
}

const LINT = {
  id: 'lint',
  label: 'Lint',
  kind: 'command' as const,
  category: 'lint' as const,
  status: 'passed' as const,
  durationMs: 12_000,
  summary: 'Command succeeded',
  ranIn: 'host' as const,
}

const TESTS = {
  id: 'test',
  label: 'Unit tests',
  kind: 'command' as const,
  category: 'test' as const,
  status: 'passed' as const,
  ranIn: 'host' as const,
}

export const CHECKS_SCOPE_NOW = NOW

export const CHECK_SCOPE_STATES: Record<string, ProcessLedgerEntry> = {
  related: checksAttempt({
    checks: [
      LINT,
      {
        ...TESTS,
        durationMs: 9_000,
        summary: '48/48 passed',
        testCount: { total: 48, passed: 48, failed: 0, skipped: 0 },
        testScope: 'related',
      },
    ],
  }),
  'whole-suite': checksAttempt({
    checks: [
      LINT,
      {
        ...TESTS,
        durationMs: 190_000,
        summary: '17770/17770 passed',
        testCount: { total: 17770, passed: 17770, failed: 0, skipped: 0 },
        testScope: 'full',
      },
    ],
  }),
  'whole-suite-because': checksAttempt({
    checks: [
      LINT,
      {
        ...TESTS,
        durationMs: 188_000,
        summary: '17770/17770 passed',
        testCount: { total: 17770, passed: 17770, failed: 0, skipped: 0 },
        testScope: 'full',
        testScopeReason: 'the change touched package.json, which every test reads',
      },
    ],
  }),
  formatted: checksAttempt({
    checks: [
      { ...LINT, id: 'format', label: 'Format', category: 'format' },
      {
        ...TESTS,
        durationMs: 9_000,
        summary: '48/48 passed',
        testCount: { total: 48, passed: 48, failed: 0, skipped: 0 },
        testScope: 'related',
      },
    ],
    formatted: { files: ['src/a.ts', 'src/b.ts'], sha: '3f9c2a1' },
  }),
}
