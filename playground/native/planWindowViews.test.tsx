// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Load the web implementation as the test runtime, not as a TypeScript dependency.
vi.mock('react-native', () => vi.importActual('react-native-web'))
vi.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }))
vi.mock('react-native-svg', () => ({
  default: 'svg',
  Circle: 'circle',
  Path: 'path',
  Polygon: 'polygon',
  Polyline: 'polyline',
  Rect: 'rect',
}))
vi.mock('../../src/native/compound/process/ProcessPipeline', () => ({ default: () => null }))
vi.mock('../../src/native/compound/files/RichText', () => ({ default: () => null }))
vi.mock('../../src/native/compound/files/ReferenceTextarea', () => ({ default: () => null }))
vi.mock('../../src/native/compound/process/SupersededFilings', () => ({ default: () => null }))
vi.mock('../../src/native/compound/chat/signoff', async () => ({
  RunModelChip: (await import('../../src/native/compound/chat/signoff/RunModelChip')).default,
  ChangesTab: () => null,
  CheckChipRow: () => null,
  ChecksTab: () => null,
  ComparisonOverlay: () => null,
  DecisionBar: () => null,
  DurationPill: () => null,
  ReportTab: () => null,
  ReviewTabBar: () => null,
  ScreensTab: () => null,
  VerdictBadge: () => null,
  WalkthroughTab: () => null,
  WorkBar: () => null,
  toneChip: () => ({}),
  toneText: () => '',
}))

import { PLAN_WINDOW_VIEWS } from './planWindowViews'
import { PLAN_WINDOW_SCENES } from '../scenes/planWindow'

// Keep the scene, providers, SDK fixture adapter, useCliRunArtifact, real panel
// (including its early returns), model chip and plan chip connected. Only the
// unrelated review body and platform drawing primitives are substituted.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('persisted playground countdowns', () => {
  const codexState = new URLSearchParams({ state: 'codex-paid' })
  const nativeHeader = PLAN_WINDOW_VIEWS.find((view) => view.id === 'cli-run-plan-window')!
  const nativeSettings = PLAN_WINDOW_VIEWS.find((view) => view.id === 'cli-plan-windows')!
  const webHeader = PLAN_WINDOW_SCENES.find((scene) => scene.id === 'cli-run-plan-window')!
  const webSettings = PLAN_WINDOW_SCENES.find((scene) => scene.id === 'cli-plan-windows')!

  it.each([
    ['native header', () => nativeHeader.render(codexState)],
    ['native settings', () => nativeSettings.render(new URLSearchParams())],
    ['web header', () => webHeader.states.find((state) => state.id === 'codex-paid')!.render()],
    ['web settings', () => webSettings.states.find((state) => state.id === 'captured')!.render()],
  ] as const)(
    'keeps the captured reset labels in %s after the fixture windows expire',
    async (_, scene) => {
      vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2030, 0, 1))
      render(scene())

      expect(await screen.findByText('62%')).toBeTruthy()
      expect(screen.getAllByText('· resets in 1 h').length).toBeGreaterThan(0)
      expect(screen.getByText('· resets in 4 d')).toBeTruthy()
    },
  )
})

it('shows web credential rows before releasing the advisory fixture response', async () => {
  const settings = PLAN_WINDOW_SCENES.find((scene) => scene.id === 'cli-plan-windows')!
  render(settings.states.find((state) => state.id === 'pending')!.render())

  expect(await screen.findByText('codex captured login')).toBeTruthy()
  expect(screen.queryByText('62%')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Release plan-window response' }))
  expect(await screen.findByText('62%')).toBeTruthy()
  expect(screen.getByText('codex captured login')).toBeTruthy()
})

describe.each(['web', 'native'] as const)('%s CLI run artifact panel', (platform) => {
  function renderState(state: string) {
    if (platform === 'web') {
      const scene = PLAN_WINDOW_SCENES.find((item) => item.id === 'cli-run-plan-window')!
      return render(scene.states.find((item) => item.id === state)!.render())
    }
    const view = PLAN_WINDOW_VIEWS.find((item) => item.id === 'cli-run-plan-window')!
    return render(view.render(new URLSearchParams({ state })))
  }

  it('shows the run’s plan window without renderable output', async () => {
    renderState('no-output')

    expect(await screen.findByText('62%')).toBeTruthy()
    expect(screen.getByText('· resets in 1 h')).toBeTruthy()
    expect(screen.queryByText('Changes this chat’s agent made')).toBeNull()
  })

  const notice = 'Discarded — not applied, and not carried into the chat’s next turn.'

  it('keeps the run’s plan window visible with the settled notice', async () => {
    renderState('settled-notice')

    expect(await screen.findByText(notice)).toBeTruthy()
    expect(screen.getByText('62%')).toBeTruthy()
    expect(screen.queryByText('Changes this chat’s agent made')).toBeNull()
  })

  it('renders no header or empty row without output or a subscription', async () => {
    const { container } = renderState('no-output-no-subscription')
    // Flush the fixture's async run read before asserting on an intentionally empty panel.
    await act(async () => {})

    expect(container.firstElementChild?.childElementCount).toBe(0)
  })

  it('renders only the settled notice without a subscription', async () => {
    const { container } = renderState('settled-notice-no-subscription')

    expect(await screen.findByText(notice)).toBeTruthy()
    expect(container.firstElementChild?.childElementCount).toBe(1)
    expect(container.textContent).toBe(notice)
  })
})

const cases = [
  ['codex-paid', ['62%', '18%']],
  ['claude-near', ['Near limit']],
  ['claude-reached', ['Limit reached']],
  ['cursor', ['Plan usage not reported']],
  ['no-window', []],
] as const

describe('native CLI run plan-window scene', () => {
  it.each(cases)('renders the real header for %s', async (state, values) => {
    const scene = PLAN_WINDOW_VIEWS.find((view) => view.id === 'cli-run-plan-window')!
    render(scene.render(new URLSearchParams({ state })))

    // A chip-only test would miss the panel returning null for empty artifacts.
    expect(await screen.findByText('Changes this chat’s agent made')).toBeTruthy()
    for (const value of values) expect(screen.getByText(value)).toBeTruthy()
    const chip = screen.queryByRole('button', { name: /plan usage\. Show details/i })
    if (state === 'no-window') {
      expect(chip).toBeNull()
      expect(screen.queryByText('Plan usage not reported')).toBeNull()
    } else {
      expect(chip).not.toBeNull()
    }
  })
})
