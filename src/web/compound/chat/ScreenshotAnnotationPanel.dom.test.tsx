import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SCREENSHOT_ANNOTATION_IDLE } from '../../../headless/utils/screenshotAnnotationConstants'
import type { ScreenshotAnnotationDraft } from '../../../headless/utils/screenshotAnnotationDraft'
import type {
  ScreenshotAnnotationSnapshot,
  ScreenshotAnnotationView,
} from '../../../headless/utils/screenshotAnnotationTypes'
import ScreenshotAnnotationPanel from './ScreenshotAnnotationPanel'

afterEach(cleanup)

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

function previewFrame(container: HTMLElement): HTMLDivElement {
  const frame = container.querySelector<HTMLDivElement>('div.relative')
  if (!frame) throw new Error('preview frame was not rendered')
  frame.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
      width: 400,
      height: 300,
      toJSON() {
        return {}
      },
    }) as DOMRect
  frame.setPointerCapture = () => {}
  return frame
}

function pointer(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1 })
}

describe('web screenshot crop', () => {
  it('crops to where the pointer lets go, not the drag last painted', () => {
    const applyCrop = vi.fn()
    const { container } = render(<ScreenshotAnnotationPanel view={viewWith(applyCrop)} />)
    const frame = previewFrame(container)

    // Paint the press so the render-copied drag is the start point.
    act(() => {
      frame.dispatchEvent(pointer('pointerdown', 10, 20))
    })
    // The last move and the release share one turn, before that move is painted.
    act(() => {
      frame.dispatchEvent(pointer('pointermove', 100, 80))
      frame.dispatchEvent(pointer('pointerup', 100, 80))
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
    const { container } = render(<ScreenshotAnnotationPanel view={viewWith(applyCrop)} />)
    const frame = previewFrame(container)

    act(() => {
      frame.dispatchEvent(pointer('pointerdown', 40, 50))
    })
    act(() => {
      frame.dispatchEvent(pointer('pointerup', 40, 50))
    })

    expect(applyCrop).not.toHaveBeenCalled()
  })
})
