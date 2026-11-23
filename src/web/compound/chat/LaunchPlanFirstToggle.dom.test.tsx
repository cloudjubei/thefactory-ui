import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LaunchPlanFirstToggle from './LaunchPlanFirstToggle'

afterEach(cleanup)

describe('LaunchPlanFirstToggle', () => {
  it('shows planning on and turns it off', () => {
    const onChange = vi.fn()
    render(<LaunchPlanFirstToggle value onChange={onChange} />)
    const sw = screen.getByRole('switch', { name: 'Plan first' })
    expect(sw.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText(/planner writes/)).toBeTruthy()
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('shows planning off and turns it back on', () => {
    const onChange = vi.fn()
    render(<LaunchPlanFirstToggle value={false} onChange={onChange} />)
    expect(screen.getByText(/without planning/)).toBeTruthy()
    fireEvent.click(screen.getByRole('switch', { name: 'Plan first' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
