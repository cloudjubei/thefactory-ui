import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { storyReadinessView } from '../../../headless/utils/storyReadinessView'
import StoryReadinessBadge from './StoryReadinessBadge'

afterEach(cleanup)

const LACKING = storyReadinessView({
  description: 'Spec',
  plan: '',
  features: [{ id: 'f1', title: 'Queue panel', status: 'pending', plan: '1.', context: ['src'] }],
} as never)

describe('StoryReadinessBadge', () => {
  it('reads Ready and lists nothing for a ready story', () => {
    render(
      <StoryReadinessBadge view={{ ready: true, label: 'Ready', tone: 'done', problems: [] }} />,
    )
    expect(screen.getByText('Ready')).toBeTruthy()
  })

  it('opens the list of what the story lacks, each feature’s problem opening its feature', () => {
    const onOpenFeature = vi.fn()
    render(<StoryReadinessBadge view={LACKING} onOpenFeature={onOpenFeature} />)
    expect(screen.queryByText('The story has no plan.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Not ready · 2/ }))
    expect(screen.getByText('The story has no plan.')).toBeTruthy()
    fireEvent.click(screen.getByText(/Queue panel/))
    expect(onOpenFeature).toHaveBeenCalledWith('f1')
  })
})
