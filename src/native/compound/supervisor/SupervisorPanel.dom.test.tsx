import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', async () => (await import('./nativeTestMocks')).reactNativeMock)
vi.mock('../../hooks/useNativeTheme', async () => {
  const tokens = await import('../../../tokens/native')
  return {
    useNativeTheme: () => ({ theme: tokens.nativeLightTheme, status: tokens.nativeLightStatus }),
  }
})
const outcome = vi.hoisted(() => vi.fn())
vi.mock('../chat/ManagerCards', () => ({
  ManagerOutcomeCardView: (props: { card: { intervention: { what: string } } }) => {
    outcome(props)
    return <span>{props.card.intervention.what}</span>
  },
}))

import { fakeSupervisor } from '../../../headless/utils/testUtils/supervisorQueueFakes'
import SupervisorPanel from './SupervisorPanel'

afterEach(() => {
  cleanup()
  outcome.mockClear()
})

describe('SupervisorPanel (native)', () => {
  it('switches the supervisor off from on', () => {
    const on = fakeSupervisor(() => vi.fn(), true)
    render(<SupervisorPanel supervisor={on} />)
    const sw = screen.getByRole('switch', { name: 'Supervisor' })
    expect(sw.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(sw)
    expect(on.setEnabled).toHaveBeenCalledWith(false)
  })

  it('switches it on from off', () => {
    const off = fakeSupervisor(() => vi.fn(), false)
    render(<SupervisorPanel supervisor={off} />)
    expect(screen.getByText(/^Off:/)).toBeTruthy()
    fireEvent.click(screen.getByRole('switch', { name: 'Supervisor' }))
    expect(off.setEnabled).toHaveBeenCalledWith(true)
  })

  it('shows what it did on the manager’s own outcome card', () => {
    const supervisor = fakeSupervisor(() => vi.fn())
    render(<SupervisorPanel supervisor={supervisor} />)
    expect(screen.getByText('Retried Implement after a flaky check')).toBeTruthy()
    expect(outcome).toHaveBeenCalledWith(
      expect.objectContaining({
        card: supervisor.view!.actions[0]!.card,
        standing: supervisor.view!.actions[0]!.standing,
      }),
    )
  })

  it('shows what it asks with the recommended answer, and opens the run on press', () => {
    const onOpenRun = vi.fn()
    render(<SupervisorPanel supervisor={fakeSupervisor(() => vi.fn())} onOpenRun={onOpenRun} />)
    expect(screen.getByText('main fails its own checks. Fix main first, or carry on?')).toBeTruthy()
    expect(screen.getByText('Recommended')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open Queue panel' }))
    expect(onOpenRun).toHaveBeenCalledWith('r2', 'tools')
  })

  it('answers with a ready answer when the host takes one', () => {
    const onAnswer = vi.fn()
    render(<SupervisorPanel supervisor={fakeSupervisor(() => vi.fn())} onAnswer={onAnswer} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fix main first' }))
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'r2' }),
      expect.objectContaining({ choice: 'retry', recommended: true }),
    )
  })

  it('links to its chat when the host has one', () => {
    const onOpenChat = vi.fn()
    render(<SupervisorPanel supervisor={fakeSupervisor(() => vi.fn())} onOpenChat={onOpenChat} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open its chat' }))
    expect(onOpenChat).toHaveBeenCalled()
  })
})
