import { describe, expect, it } from 'vitest'
import {
  cropToImagePixels,
  keptAttachmentPath,
  previewCropMapping,
  resolveAppRegion,
  resolveEntireImage,
  resolveScreenshotCrop,
  screenshotCropPercent,
  screenshotDragRect,
  screenshotNote,
  screenshotPreviewUri,
  screenshotUnavailableReason,
} from './screenshotAnnotation'
import { SCREENSHOT_ANNOTATION_TEXT } from './screenshotAnnotationConstants'
import type { ScreenshotCropMapping, ScreenshotLaunch } from './screenshotAnnotationTypes'
import type { ChatContext } from '../api/generated'

const IMAGE = { width: 1000, height: 500 }

const viewportMapping = (
  overrides: Partial<ScreenshotCropMapping> = {},
): ScreenshotCropMapping => ({
  iframeOffset: { x: 0, y: 0 },
  scroll: { x: 0, y: 0 },
  hostZoom: 1,
  scaleX: 1,
  scaleY: 1,
  image: IMAGE,
  space: 'app-viewport',
  ...overrides,
})

describe('cropToImagePixels', () => {
  it('maps a selection through offset, scroll, zoom and a per-axis fractional scale', () => {
    const mapped = cropToImagePixels(
      { x: 30, y: 20, width: 40, height: 10 },
      viewportMapping({
        iframeOffset: { x: 10, y: 5 },
        scroll: { x: 5, y: 5 },
        hostZoom: 1.25,
        scaleX: 1.5,
        scaleY: 0.8,
      }),
    )
    expect(mapped).toEqual({
      ok: true,
      imageRect: { x: 46.875, y: 20, width: 75, height: 10 },
      localRect: { x: 25, y: 20, width: 40, height: 10 },
    })
  })

  it('clips a selection that runs past the image to the image', () => {
    const mapped = cropToImagePixels({ x: 900, y: 400, width: 300, height: 300 }, viewportMapping())
    expect(mapped).toMatchObject({
      ok: true,
      imageRect: { x: 900, y: 400, width: 100, height: 100 },
    })
  })

  it.each([
    ['a zero-width selection', { x: 10, y: 10, width: 0, height: 10 }],
    ['a negative-height selection', { x: 10, y: 10, width: 10, height: -4 }],
    ['a selection wholly outside the image', { x: 2000, y: 10, width: 10, height: 10 }],
    ['a sliver under one image pixel', { x: 10, y: 10, width: 0.5, height: 10 }],
    ['a non-finite origin', { x: Number.NaN, y: 10, width: 10, height: 10 }],
  ])('refuses %s as an empty crop', (_name, selection) => {
    expect(cropToImagePixels(selection, viewportMapping())).toEqual({
      ok: false,
      reason: SCREENSHOT_ANNOTATION_TEXT.invalidCrop,
    })
  })

  it.each([
    ['a zero scale', { scaleX: 0 }],
    ['a negative zoom', { hostZoom: -1 }],
    ['an infinite scroll', { scroll: { x: Number.POSITIVE_INFINITY, y: 0 } }],
  ])('refuses %s as an invalid mapping', (_name, overrides) => {
    expect(
      cropToImagePixels({ x: 1, y: 1, width: 10, height: 10 }, viewportMapping(overrides)),
    ).toEqual({
      ok: false,
      reason: SCREENSHOT_ANNOTATION_TEXT.invalidMapping,
    })
  })

  it('refuses an image without a usable size', () => {
    expect(
      cropToImagePixels(
        { x: 1, y: 1, width: 10, height: 10 },
        viewportMapping({ image: { width: 0, height: 10 } }),
      ),
    ).toEqual({ ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.invalidImage })
  })
})

describe('previewCropMapping', () => {
  it('scales from rendered points to decoded pixels per axis, never by devicePixelRatio', () => {
    expect(previewCropMapping(IMAGE, { width: 400, height: 250 })).toEqual({
      iframeOffset: { x: 0, y: 0 },
      scroll: { x: 0, y: 0 },
      hostZoom: 1,
      scaleX: 2.5,
      scaleY: 2,
      image: IMAGE,
      space: 'preview',
    })
  })

  it('has no mapping before the preview has a size', () => {
    expect(previewCropMapping(IMAGE, { width: 0, height: 250 })).toBeNull()
    expect(previewCropMapping({ width: 0, height: 0 }, { width: 10, height: 10 })).toBeNull()
  })
})

describe('resolveScreenshotCrop', () => {
  it('records a crop on an app capture in app-viewport points', () => {
    const mapping = previewCropMapping(IMAGE, { width: 500, height: 250 }) as ScreenshotCropMapping
    expect(
      resolveScreenshotCrop({
        selection: { x: 50, y: 25, width: 100, height: 50 },
        mapping,
        source: 'app',
        appViewport: { width: 500, height: 250 },
      }),
    ).toEqual({
      ok: true,
      imageRect: { x: 100, y: 50, width: 200, height: 100 },
      rect: { x: 50, y: 25, width: 100, height: 50, space: 'app-viewport' },
    })
  })

  it('keeps a display crop inside the measured app and maps it to app points', () => {
    const mapping = previewCropMapping(IMAGE, { width: 1000, height: 500 }) as ScreenshotCropMapping
    expect(
      resolveScreenshotCrop({
        selection: { x: 0, y: 0, width: 400, height: 300 },
        mapping,
        source: 'display',
        appViewport: { width: 100, height: 100 },
        appInImage: { x: 200, y: 100, width: 400, height: 200 },
      }),
    ).toEqual({
      ok: true,
      imageRect: { x: 200, y: 100, width: 200, height: 200 },
      rect: { x: 0, y: 0, width: 50, height: 100, space: 'app-viewport' },
    })
  })

  it('refuses a display crop that misses the app', () => {
    const mapping = previewCropMapping(IMAGE, { width: 1000, height: 500 }) as ScreenshotCropMapping
    expect(
      resolveScreenshotCrop({
        selection: { x: 0, y: 0, width: 100, height: 100 },
        mapping,
        source: 'display',
        appViewport: { width: 100, height: 100 },
        appInImage: { x: 500, y: 200, width: 100, height: 100 },
      }),
    ).toEqual({ ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.invalidCrop })
  })

  it('refuses an app crop when the app size was never measured', () => {
    const mapping = previewCropMapping(IMAGE, { width: 500, height: 250 }) as ScreenshotCropMapping
    expect(
      resolveScreenshotCrop({
        selection: { x: 0, y: 0, width: 10, height: 10 },
        mapping,
        source: 'app',
      }),
    ).toEqual({ ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.appSize })
  })

  it('refuses a display crop until it is mapped through the measured app', () => {
    const mapping = previewCropMapping(IMAGE, { width: 1000, height: 500 }) as ScreenshotCropMapping
    const selection = { x: 40, y: 20, width: 200, height: 100 }
    expect(
      resolveScreenshotCrop({
        selection,
        mapping,
        source: 'display',
        appViewport: { width: 400, height: 300 },
      }),
    ).toEqual({ ok: false, reason: SCREENSHOT_ANNOTATION_TEXT.appSize })
    expect(resolveScreenshotCrop({ selection, mapping, source: 'display' })).toEqual({
      ok: false,
      reason: SCREENSHOT_ANNOTATION_TEXT.appSize,
    })
  })
})

describe('resolveEntireImage and resolveAppRegion', () => {
  it('takes the whole app capture as the whole viewport', () => {
    expect(resolveEntireImage({ source: 'app', appViewport: { width: 320, height: 640 } })).toEqual(
      {
        ok: true,
        rect: { x: 0, y: 0, width: 320, height: 640, space: 'app-viewport' },
      },
    )
  })

  it('never takes a whole display capture', () => {
    expect(resolveEntireImage({ source: 'display', appViewport: { width: 1, height: 1 } })).toEqual(
      {
        ok: false,
        reason: SCREENSHOT_ANNOTATION_TEXT.needsAppCrop,
      },
    )
  })

  it('crops a display capture to the measured app, clipped to the image', () => {
    expect(
      resolveAppRegion({
        image: IMAGE,
        appInImage: { x: 800, y: 0, width: 400, height: 500 },
        appViewport: { width: 200, height: 500 },
      }),
    ).toEqual({
      ok: true,
      imageRect: { x: 800, y: 0, width: 200, height: 500 },
      rect: { x: 0, y: 0, width: 200, height: 500, space: 'app-viewport' },
    })
  })
})

describe('screenshotCropPercent', () => {
  it('places a pixel crop on the preview as fractions of the image', () => {
    expect(screenshotCropPercent({ x: 250, y: 50, width: 500, height: 125 }, IMAGE)).toEqual({
      left: '25%',
      top: '10%',
      width: '50%',
      height: '25%',
    })
  })
})

describe('screenshotDragRect', () => {
  it('makes one rectangle from a drag in any direction', () => {
    expect(screenshotDragRect({ x: 30, y: 40 }, { x: 10, y: 15 })).toEqual({
      x: 10,
      y: 15,
      width: 20,
      height: 25,
    })
  })
})

describe('screenshotPreviewUri', () => {
  it('shows a native file by its uri and a web blob not at all', () => {
    expect(screenshotPreviewUri({ name: 'a.png', uri: 'file:///cache/a.png' })).toBe(
      'file:///cache/a.png',
    )
    expect(screenshotPreviewUri({ name: 'a.png', size: 1, blob: new Blob(['x']) })).toBeNull()
  })
})

describe('screenshotUnavailableReason', () => {
  it('says why when there is no adapter, or the adapter says it cannot', () => {
    expect(screenshotUnavailableReason(undefined)).toBe(SCREENSHOT_ANNOTATION_TEXT.noAdapter)
    expect(
      screenshotUnavailableReason({
        unavailableReason: '  Needs a newer browser. ',
        capture: async () => {
          throw new Error('never')
        },
        release: () => {},
      }),
    ).toBe('Needs a newer browser.')
  })

  it('has no reason for an adapter that can capture', () => {
    expect(
      screenshotUnavailableReason({
        capture: async () => {
          throw new Error('never')
        },
        release: () => {},
      }),
    ).toBeNull()
  })
})

describe('keptAttachmentPath and screenshotNote', () => {
  const launch: ScreenshotLaunch = {
    context: { type: 'PROJECT', projectId: 'p1' } as ChatContext,
    projectId: 'p1',
    route: { view: 'settings', params: { tab: 'billing' } },
  }

  it.each([
    'blob:http://host/123',
    'file:///cache/a.png',
    'data:image/png;base64,AAAA',
    '.factory/attachments/../a.png',
    '.factory/attachments/./a.png',
    '.factory/attachments/%2e%2e/a.png',
    '/abs/.factory/attachments/a.png',
  ])('refuses %s as a kept attachment', (path) => {
    expect(keptAttachmentPath(path)).toBeNull()
  })

  it('keeps a stored attachment path', () => {
    expect(keptAttachmentPath('.factory/attachments/chat-1/shot.png')).toBe(
      '.factory/attachments/chat-1/shot.png',
    )
  })

  it('writes one area note on the launch route with only the kept path', () => {
    const note = screenshotNote({
      id: 'app-note-1',
      launch,
      comment: 'Bigger',
      rect: { x: 1, y: 2, width: 3, height: 4, space: 'app-viewport' },
      screenshotFile: '.factory/attachments/chat-1/shot.png',
    })
    expect(note).toEqual({
      id: 'app-note-1',
      projectId: 'p1',
      view: 'settings',
      params: { tab: 'billing' },
      comment: 'Bigger',
      targets: [{ kind: 'area', rect: { x: 1, y: 2, width: 3, height: 4, space: 'app-viewport' } }],
      screenshotFile: '.factory/attachments/chat-1/shot.png',
    })
    expect(note.params).not.toBe(launch.route?.params)
  })
})
