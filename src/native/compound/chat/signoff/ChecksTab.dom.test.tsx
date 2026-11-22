import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}))
vi.mock('../../../hooks/useNativeTheme', async () => {
  const tokens = await import('../../../../tokens/native')
  return {
    useNativeTheme: () => ({ theme: tokens.nativeLightTheme, status: tokens.nativeLightStatus }),
  }
})
vi.mock('../../../icons', () => ({ IconPlay: () => null }))
vi.mock('../../../primitives/Button', () => ({
  Button: ({
    children,
    onPress,
    disabled,
    loading,
    accessibilityLabel,
  }: {
    children: ReactNode
    onPress: () => void
    disabled?: boolean
    loading?: boolean
    accessibilityLabel?: string
  }) => (
    <button aria-label={accessibilityLabel} disabled={disabled || loading} onClick={onPress}>
      {children}
    </button>
  ),
}))
vi.mock('../../chips/CheckChip', () => ({ default: () => null }))
vi.mock('../../chips/HandoffButton', () => ({ default: () => null }))
vi.mock('../../chips/SetUpWithAgentButton', () => ({ default: () => null }))
vi.mock('../../TerminalOutput', () => ({ TerminalOutput: () => null }))
vi.mock('../../tests/TestResultsList', () => ({ TestResultsList: () => null }))
vi.mock('./DurationPill', () => ({ default: () => null }))
vi.mock('./UnfinishedTests', () => ({ UnfinishedTests: () => null }))

import { checkMethodRows, reviewCheckGroups, type CheckMethodId } from '../../../../headless'
import type { RunVerification } from '../../../../headless/api/generated'
import ChecksTab from './ChecksTab'

const VERIFICATION: RunVerification = {
  status: 'failed',
  startedAt: 0,
  finishedAt: 1_000,
  checks: [
    {
      id: 'unit',
      label: 'Unit tests',
      kind: 'tests',
      category: 'test',
      tier: 'unit',
      status: 'failed',
      durationMs: 4_000,
      command: 'npx vitest run',
      summary: '1 failed',
      testCount: { total: 10, passed: 9, failed: 1, skipped: 0 },
    },
    {
      id: 'integration',
      label: 'Integration tests',
      kind: 'tests',
      category: 'test',
      tier: 'integration',
      status: 'passed',
      durationMs: 6_000,
      command: 'npx vitest run --project integration',
      summary: '4 passed',
      testCount: { total: 4, passed: 4, failed: 0, skipped: 0 },
    },
    {
      id: 'typecheck',
      label: 'Type check',
      kind: 'compile',
      category: 'typecheck',
      status: 'passed',
      durationMs: 3_000,
      command: 'npm run typecheck',
      summary: 'No type errors',
    },
    {
      id: 'lint',
      label: 'Lint',
      kind: 'command',
      category: 'lint',
      status: 'failed',
      durationMs: 2_000,
      command: 'npm run lint',
      summary: '2 errors',
    },
  ],
}

const ROWS = checkMethodRows({ verification: VERIFICATION, approaches: [], evidence: [] })
const GROUPS = reviewCheckGroups(VERIFICATION)
const TESTS: readonly CheckMethodId[] = ['tests']
const BUILD: readonly CheckMethodId[] = ['types', 'lint']

function renderTab(
  tab: 'tests' | 'build',
  run?: { onRunChecks: (ids: readonly string[]) => void; runningCheckIds?: readonly string[] },
) {
  return render(
    <ChecksTab
      methods={ROWS.filter((row) => (tab === 'tests' ? TESTS : BUILD).includes(row.id))}
      checks={tab === 'tests' ? GROUPS.tests : GROUPS.build}
      branch="agent/run"
      busyId={undefined}
      {...(run ?? {})}
    />,
  )
}

const isDisabled = (element: HTMLElement) => (element as HTMLButtonElement).disabled

afterEach(cleanup)

describe('native ChecksTab Run button', () => {
  it('runs one test layer on its own', () => {
    const onRunChecks = vi.fn()
    renderTab('tests', { onRunChecks })
    fireEvent.click(screen.getByRole('button', { name: 'Run Integration tests' }))
    expect(onRunChecks).toHaveBeenCalledWith(['integration'])
  })

  it('runs a build method with the checks rolled into it', () => {
    const onRunChecks = vi.fn()
    renderTab('build', { onRunChecks })
    const typesRow = ROWS.find((row) => row.id === 'types')!
    fireEvent.click(screen.getByRole('button', { name: `Run ${typesRow.label}` }))
    expect(onRunChecks).toHaveBeenCalledWith(['typecheck'])
  })

  it('spins the running block and holds the others while one block runs', () => {
    const onRunChecks = vi.fn()
    renderTab('tests', { onRunChecks, runningCheckIds: ['unit'] })
    const unit = screen.getByRole('button', { name: 'Run Unit tests' })
    const integration = screen.getByRole('button', { name: 'Run Integration tests' })
    expect(isDisabled(unit)).toBe(true)
    expect(unit.textContent).toContain('Running')
    expect(isDisabled(integration)).toBe(true)
    expect(integration.textContent).not.toContain('Running')
    fireEvent.click(integration)
    expect(onRunChecks).not.toHaveBeenCalled()
  })

  it('spins every block while the whole pass runs', () => {
    renderTab('build', { onRunChecks: vi.fn(), runningCheckIds: [] })
    const buttons = screen.getAllByRole('button', { name: /^Run / })
    expect(buttons).toHaveLength(2)
    for (const button of buttons) {
      expect(isDisabled(button)).toBe(true)
      expect(button.textContent).toContain('Running')
    }
  })

  it('offers no Run button on a read-only record', () => {
    renderTab('tests')
    expect(screen.queryAllByRole('button', { name: /^Run / })).toHaveLength(0)
  })
})
