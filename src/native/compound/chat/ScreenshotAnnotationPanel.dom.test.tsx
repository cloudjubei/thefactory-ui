import type { ReactNode } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SCREENSHOT_ANNOTATION_IDLE } from '../../../headless/utils/screenshotAnnotationConstants'
import type { ScreenshotAnnotationDraft } from '../../../headless/utils/screenshotAnnotationDraft'
import type {
  ScreenshotAnnotationSnapshot,
  ScreenshotAnnotationView,
} from '../../../headless/utils/screenshotAnnotationTypes'

type GesturePoint = { nativeEvent: { locationX: number; locationY: number } }
type LayoutEvent = { nativeEvent: { layout: { width: number; height: number } } }
type Responder = {
  onPanResponderGrant: (event: GesturePoint) => void
  onPanResponderMove: (event: GesturePoint) => void
  onPanResponderRelease: () => void
}

const native = vi.hoisted(() => ({
  responder: null as Responder | null,
  onLayout: null as ((event: LayoutEvent) => void) | null,
}))

vi.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }))
vi.mock('react-native', () => ({
  PanResponder: {
    create: (config: Responder) => {
      native.responder = config
      return { panHandlers: {} }
    },
  },
  Image: () => null,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  TextInput: () => null,
  View: ({
    children,
    onLayout,
    accessibilityLabel,
  }: {
    children?: ReactNode
    onLayout?: (event: LayoutEvent) => void
    accessibilityLabel?: string
  }) => {
    if (onLayout) native.onLayout = onLayout
    return <div aria-label={accessibilityLabel}>{children}</div>
  },
}))
vi.mock('../../primitives/Button', () => ({
  Button: ({ children }: { children?: ReactNode }) => <button type="button">{children}</button>,
}))

import ScreenshotAnnotationPanel from './ScreenshotAnnotationPanel'

afterEach(() => {
  cleanup()
  native.responder = null
  native.onLayout = null
})

const at = (x: number, y: number): GesturePoint => ({ nativeEvent: { locationX: x, locationY: y } })

const preview: ScreenshotAnnotationSnapshot = {
  ...SCREENSHOT_ANNOTATION_IDLE,
  phase: 'preview',
  source: 'app',
  image: { width: 800, height: 600 },
  canCrop: true,
  canComment: true,
  canConfirm: true,
  canRemove: true,
  canUseEntireImage: true,
}

function viewWith(applyCrop: ScreenshotAnnotationDraft['applyCrop']): ScreenshotAnnotationView {
  return {
    draft: { applyCrop } as ScreenshotAnnotationDraft,
    snapshot: preview,
    unavailableReason: null,
    previewFile: null,
    capture: () => {},
  }
}

describe('native screenshot crop', () => {
  it('crops to where the finger lets go, not the drag last painted', () => {
    const applyCrop = vi.fn()
    render(<ScreenshotAnnotationPanel view={viewWith(applyCrop)} />)
    act(() => {
      native.onLayout?.({ nativeEvent: { layout: { width: 400, height: 300 } } })
    })
    const responder = native.responder
    expect(responder).not.toBeNull()

    // Paint the grant so the render-copied drag is the start point.
    act(() => {
      responder!.onPanResponderGrant(at(10, 20))
    })
    // The last move and the release share one turn, before that move is painted.
    act(() => {
      responder!.onPanResponderMove(at(100, 80))
      responder!.onPanResponderRelease()
    })

    expect(applyCrop).toHaveBeenCalledTimes(1)
    expect(applyCrop).toHaveBeenCalledWith(
      { x: 10, y: 20, width: 90, height: 60 },
      expect.objectContaining({
        space: 'preview',
        scaleX: 2,
        scaleY: 2,
        image: { width: 800, height: 600 },
      }),
    )
  })

  it('ignores a click so it does not flag an empty crop', () => {
    const applyCrop = vi.fn()
    render(<ScreenshotAnnotationPanel view={viewWith(applyCrop)} />)
    act(() => {
      native.onLayout?.({ nativeEvent: { layout: { width: 400, height: 300 } } })
    })
    const responder = native.responder
    expect(responder).not.toBeNull()

    act(() => {
      responder!.onPanResponderGrant(at(40, 50))
    })
    act(() => {
      responder!.onPanResponderRelease()
    })

    expect(applyCrop).not.toHaveBeenCalled()
  })
})
