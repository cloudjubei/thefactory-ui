// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SIGNOFF_CHIP_SCENES } from './signoffChips'

vi.mock('../../src/web/compound/chat/signoff/useElementSize', () => ({
  useElementSize: () => ({ w: 1000, h: 700 }),
}))
vi.mock('../../src/web/compound/chat/signoff/useImageNaturalSize', () => ({
  useImageNaturalSize: () => ({ w: 240, h: 400 }),
}))
afterEach(cleanup)

describe('build-bearing Screens showcase integration', () => {
  it('opens Account and its earlier attempt with real build chips and overlay modes', async () => {
    const state = SIGNOFF_CHIP_SCENES.find((s) => s.id === 'measured-screen-pairs')!.states.find(
      (s) => s.id === 'builds',
    )!
    render(<>{state.render()}</>)
    fireEvent.click(screen.getByRole('button', { name: /Compare.*Account/ }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Commit base-commit' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Commit head-current' }).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('radio', { name: 'Mirror' }))
    expect(within(screen.getByRole('dialog')).getByAltText('Account — before')).toBeTruthy()
    expect(within(screen.getByRole('dialog')).getByAltText('Account — after')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /Earlier attempts/ }))
    const accounts = screen.getAllByRole('button', { name: /Compare.*Account/ })
    fireEvent.click(accounts[accounts.length - 1]!)
    expect(await screen.findByRole('button', { name: 'Commit head-earlier' })).toBeTruthy()
  })
})
