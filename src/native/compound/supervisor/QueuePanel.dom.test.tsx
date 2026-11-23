import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', async () => (await import('./nativeTestMocks')).reactNativeMock)
vi.mock('../../hooks/useNativeTheme', async () => {
  const tokens = await import('../../../tokens/native')
  return {
    useNativeTheme: () => ({ theme: tokens.nativeLightTheme, status: tokens.nativeLightStatus }),
  }
})
vi.mock('../../icons', () => ({
  IconArrowUp: () => null,
  IconArrowDown: () => null,
  IconClose: () => null,
  IconPlus: () => null,
}))

import {
  FAKE_QUEUE_A,
  FAKE_QUEUE_B,
  FAKE_QUEUE_C,
  fakeWorkQueue,
} from '../../../headless/utils/testUtils/supervisorQueueFakes'
import QueuePanel from './QueuePanel'

afterEach(cleanup)

describe('QueuePanel (native)', () => {
  it('says the queue is empty, with the cap in use', () => {
    render(<QueuePanel queue={fakeWorkQueue(() => vi.fn(), true)} />)
    expect(screen.getByText(/Nothing queued/)).toBeTruthy()
    expect(screen.getByText('7 of 10 running')).toBeTruthy()
  })

  it('shows each entry with its state, and opens it on press', () => {
    const onOpen = vi.fn()
    render(<QueuePanel queue={fakeWorkQueue(() => vi.fn())} onOpen={onOpen} />)
    expect(screen.getByText('Running')).toBeTruthy()
    expect(screen.getByText('Next')).toBeTruthy()
    expect(screen.getByText('Waiting on blockers')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open Beta' }))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ entry: FAKE_QUEUE_B }))
  })

  it('moves and removes, and offers no move past either end', () => {
    const queue = fakeWorkQueue(() => vi.fn())
    const onOpen = vi.fn()
    render(<QueuePanel queue={queue} onOpen={onOpen} />)
    const ups = screen.getAllByRole('button', { name: 'Move up' }) as HTMLButtonElement[]
    const downs = screen.getAllByRole('button', { name: 'Move down' }) as HTMLButtonElement[]
    fireEvent.click(ups[1]!)
    fireEvent.click(downs[1]!)
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[2]!)
    expect(queue.moveUp).toHaveBeenCalledWith(FAKE_QUEUE_B)
    expect(queue.moveDown).toHaveBeenCalledWith(FAKE_QUEUE_B)
    expect(queue.remove).toHaveBeenCalledWith(FAKE_QUEUE_C)
    expect(onOpen).not.toHaveBeenCalled()
    expect(ups[0]!.disabled).toBe(true)
    expect(downs[2]!.disabled).toBe(true)
  })

  it('adds a story not queued yet from the list Add opens', () => {
    const queue = fakeWorkQueue(() => vi.fn())
    const D = { kind: 'story' as const, projectId: 'tools', storyId: 'd' }
    render(
      <QueuePanel
        queue={queue}
        candidates={[
          { entry: FAKE_QUEUE_A, title: 'Alpha' },
          { entry: D, title: 'Delta' },
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.queryByRole('button', { name: 'Queue Alpha' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Queue Delta' }))
    expect(queue.add).toHaveBeenCalledWith(D)
  })
})
