import { vi } from 'vitest'
import type { ChatContext } from '../../api/generated'
import type {
  ScreenshotCaptureAdapter,
  ScreenshotCapturedPixels,
  ScreenshotLaunch,
} from '../screenshotAnnotationTypes'

export type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

export const launchFor = (chatId: string, view = 'home'): ScreenshotLaunch => ({
  context: { type: 'PROJECT_TOPIC', projectId: 'p1', id: chatId } as unknown as ChatContext,
  projectId: 'p1',
  route: { view, params: { tab: view } },
})

export const appPixels = (
  name = 'shot.png',
  overrides: Partial<ScreenshotCapturedPixels> = {},
): ScreenshotCapturedPixels => ({
  file: { name, size: 10, blob: new Blob(['png']) },
  image: { width: 800, height: 600 },
  source: 'app',
  appViewport: { width: 400, height: 300 },
  ...overrides,
})

/** An adapter whose captures and crops finish when the test says, recording every release. */
export function fakeAdapter() {
  const captures: Deferred<ScreenshotCapturedPixels>[] = []
  const signals: AbortSignal[] = []
  const crops: Deferred<ScreenshotCapturedPixels>[] = []
  const released: ScreenshotCapturedPixels[] = []
  const adapter: ScreenshotCaptureAdapter = {
    capture: vi.fn(({ signal }: { signal: AbortSignal }) => {
      const next = deferred<ScreenshotCapturedPixels>()
      captures.push(next)
      signals.push(signal)
      return next.promise
    }),
    release: vi.fn((pixels: ScreenshotCapturedPixels) => {
      released.push(pixels)
    }),
    crop: vi.fn(() => {
      const next = deferred<ScreenshotCapturedPixels>()
      crops.push(next)
      return next.promise
    }),
  }
  return { adapter, captures, signals, crops, released }
}
