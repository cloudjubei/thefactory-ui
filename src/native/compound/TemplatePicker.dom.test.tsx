import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nativeLightTheme } from '../../tokens/native'
import type { Template } from '../../headless/contexts/TemplatesContext'

const templatesApi = vi.hoisted(() => ({
  templates: [] as Template[],
  isLoaded: true,
  loadError: null as Error | null,
}))

vi.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }))
vi.mock('react-native', () => ({
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  ScrollView: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Image: ({ source }: { source: { uri: string } }) => (
    <img src={source.uri} alt="" data-testid="template-thumb" />
  ),
  Pressable: ({
    children,
    onPress,
    accessibilityState,
  }: {
    children?: ReactNode
    onPress?: () => void
    accessibilityState?: { selected?: boolean }
  }) => (
    <button
      type="button"
      onClick={onPress}
      aria-selected={accessibilityState?.selected ? 'true' : 'false'}
    >
      {children}
    </button>
  ),
}))
vi.mock('../hooks/useNativeTheme', () => ({
  useNativeTheme: () => ({ theme: nativeLightTheme, status: {}, colorScheme: 'light' }),
}))
vi.mock('../../headless/contexts/TemplatesContext', () => ({
  useTemplates: () => ({
    templates: templatesApi.templates,
    isLoaded: templatesApi.isLoaded,
    loadError: templatesApi.loadError,
  }),
}))

import TemplatePicker from './TemplatePicker'

afterEach(() => {
  cleanup()
  templatesApi.templates = []
  templatesApi.isLoaded = true
  templatesApi.loadError = null
})

const sample: Template = {
  id: 'car-finder',
  name: 'Car Finder',
  description: 'A working car-buying helper',
  repoUrl: 'https://github.com/example/car-finder',
  difficulty: 'intermediate',
  estimatedTime: '1-2 hours',
  thumbnailUrl: 'https://cdn.example/car.png',
}

describe('native TemplatePicker', () => {
  it('renders selectable cards with thumbnail, difficulty and estimated time', () => {
    templatesApi.templates = [
      sample,
      {
        id: 'plastic-free',
        name: 'Plastic-Free',
        description: 'Plastic-free replacements',
        repoUrl: 'https://github.com/example/plastic-free',
        difficulty: 'beginner',
        estimatedTime: '30 min',
      },
    ]
    const onSelect = vi.fn()
    render(<TemplatePicker value="car-finder" onSelect={onSelect} />)

    expect(screen.getByText('Car Finder')).toBeTruthy()
    expect(screen.getByText('Plastic-Free')).toBeTruthy()
    expect(screen.getByText('Intermediate')).toBeTruthy()
    expect(screen.getByText('1-2 hours')).toBeTruthy()
    expect(screen.getByText('Beginner')).toBeTruthy()
    expect(screen.getByText('30 min')).toBeTruthy()
    expect(screen.getByTestId('template-thumb').getAttribute('src')).toBe(
      'https://cdn.example/car.png',
    )
    // Letter fallback when thumbnail is absent
    expect(screen.getByText('P')).toBeTruthy()

    fireEvent.click(screen.getByText('Plastic-Free'))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: 'plastic-free', name: 'Plastic-Free' }),
    )
  })

  it('shows loading and empty states', () => {
    templatesApi.isLoaded = false
    const { rerender } = render(<TemplatePicker onSelect={vi.fn()} />)
    expect(screen.getByText('Loading templates…')).toBeTruthy()

    templatesApi.isLoaded = true
    templatesApi.templates = []
    rerender(<TemplatePicker onSelect={vi.fn()} />)
    expect(screen.getByText('No templates available.')).toBeTruthy()
  })
})
