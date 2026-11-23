import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FAKE_QUEUE_A,
  FAKE_QUEUE_B,
  FAKE_QUEUE_C,
  fakeWorkQueue,
} from '../../../headless/utils/testUtils/supervisorQueueFakes'
import QueuePanel from './QueuePanel'

afterEach(cleanup)

const row = (title: string) => screen.getByText(title).closest('[data-queue-row]') as HTMLElement

describe('QueuePanel', () => {
  it('says the queue is empty', () => {
    render(<QueuePanel queue={fakeWorkQueue(() => vi.fn(), true)} />)
    expect(screen.getByText(/Nothing queued/)).toBeTruthy()
    expect(screen.getByText('7 of 10 running')).toBeTruthy()
  })

  it('shows each entry with its state', () => {
    render(<QueuePanel queue={fakeWorkQueue(() => vi.fn())} />)
    expect(within(row('Alpha')).getByText('Running')).toBeTruthy()
    expect(within(row('Beta')).getByText('Next')).toBeTruthy()
    expect(within(row('Gamma')).getByText('Waiting on blockers')).toBeTruthy()
    expect(within(row('Gamma')).getByText('Waits on Login API')).toBeTruthy()
  })

  it('opens an entry when its row is clicked', () => {
    const onOpen = vi.fn()
    render(<QueuePanel queue={fakeWorkQueue(() => vi.fn())} onOpen={onOpen} />)
    fireEvent.click(row('Beta'))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ entry: FAKE_QUEUE_B }))
  })

  it('moves and removes without opening the row, and offers no move past either end', () => {
    const queue = fakeWorkQueue(() => vi.fn())
    const onOpen = vi.fn()
    render(<QueuePanel queue={queue} onOpen={onOpen} />)
    fireEvent.click(within(row('Beta')).getByRole('button', { name: 'Move up' }))
    fireEvent.click(within(row('Beta')).getByRole('button', { name: 'Move down' }))
    fireEvent.click(within(row('Gamma')).getByRole('button', { name: 'Remove' }))
    expect(queue.moveUp).toHaveBeenCalledWith(FAKE_QUEUE_B)
    expect(queue.moveDown).toHaveBeenCalledWith(FAKE_QUEUE_B)
    expect(queue.remove).toHaveBeenCalledWith(FAKE_QUEUE_C)
    expect(onOpen).not.toHaveBeenCalled()
    expect(
      (within(row('Alpha')).getByRole('button', { name: 'Move up' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (within(row('Gamma')).getByRole('button', { name: 'Move down' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
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
    expect(screen.queryByRole('button', { name: 'Alpha' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Delta' }))
    expect(queue.add).toHaveBeenCalledWith(D)
  })

  it('says when the cap is reached', () => {
    const queue = fakeWorkQueue(() => vi.fn())
    render(
      <QueuePanel
        queue={{
          ...queue,
          view: { ...queue.view!, capReached: true, capLine: '10 of 10 running' },
        }}
      />,
    )
    expect(screen.getByText('10 of 10 running')).toBeTruthy()
    expect(screen.getByText(/Cap reached/)).toBeTruthy()
  })
})
