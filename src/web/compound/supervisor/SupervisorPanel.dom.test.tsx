import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeSupervisor } from '../../../headless/utils/testUtils/supervisorQueueFakes'
import SupervisorPanel from './SupervisorPanel'

afterEach(cleanup)

describe('SupervisorPanel', () => {
  it('switches the supervisor off from on, and on from off', () => {
    const on = fakeSupervisor(() => vi.fn(), true)
    const { unmount } = render(<SupervisorPanel supervisor={on} />)
    const sw = screen.getByRole('switch', { name: 'Supervisor' })
    expect(sw.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(sw)
    expect(on.setEnabled).toHaveBeenCalledWith(false)
    unmount()
    const off = fakeSupervisor(() => vi.fn(), false)
    render(<SupervisorPanel supervisor={off} />)
    expect(screen.getByText(/^Off:/)).toBeTruthy()
    fireEvent.click(screen.getByRole('switch', { name: 'Supervisor' }))
    expect(off.setEnabled).toHaveBeenCalledWith(true)
  })

  it('shows what it did on the manager’s Handled card', () => {
    render(<SupervisorPanel supervisor={fakeSupervisor(() => vi.fn())} />)
    expect(screen.getByText('Retried Implement after a flaky check')).toBeTruthy()
    expect(screen.getByText('Handled')).toBeTruthy()
    expect(screen.getByText('The step passed on the retry.')).toBeTruthy()
  })

  it('shows what it asks with the recommended answer, and opens the run on click', () => {
    const onOpenRun = vi.fn()
    render(<SupervisorPanel supervisor={fakeSupervisor(() => vi.fn())} onOpenRun={onOpenRun} />)
    expect(screen.getByText('main fails its own checks. Fix main first, or carry on?')).toBeTruthy()
    expect(screen.getByText('Recommended')).toBeTruthy()
    fireEvent.click(screen.getByText('Queue panel'))
    expect(onOpenRun).toHaveBeenCalledWith('r2', 'tools')
  })

  it('answers with a ready answer when the host takes one, without opening the run', () => {
    const onAnswer = vi.fn()
    const onOpenRun = vi.fn()
    render(
      <SupervisorPanel
        supervisor={fakeSupervisor(() => vi.fn())}
        onAnswer={onAnswer}
        onOpenRun={onOpenRun}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Fix main first/ }))
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'r2' }),
      expect.objectContaining({ choice: 'retry', recommended: true }),
    )
    expect(onOpenRun).not.toHaveBeenCalled()
  })

  it('links to its chat when the host has one', () => {
    const onOpenChat = vi.fn()
    render(<SupervisorPanel supervisor={fakeSupervisor(() => vi.fn())} onOpenChat={onOpenChat} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open its chat' }))
    expect(onOpenChat).toHaveBeenCalled()
  })
})
