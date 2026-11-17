import type { ReactNode } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SpeechToTextEngineContext,
  useSpeechToText,
  type SpeechToTextEngine,
} from './useSpeechToText'

type StartOptions = Parameters<SpeechToTextEngine['start']>[0]
type Stop = Awaited<ReturnType<SpeechToTextEngine['start']>>

function stubEngine(supported = true) {
  let callbacks: StartOptions | undefined
  const stop = vi.fn<Stop>()
  const start = vi.fn<SpeechToTextEngine['start']>(async (options) => {
    callbacks = options
    return stop
  })
  const engine: SpeechToTextEngine = { isSupported: () => supported, start }
  function wrapper({ children }: { children: ReactNode }) {
    return <SpeechToTextEngineContext value={engine}>{children}</SpeechToTextEngineContext>
  }
  return {
    wrapper,
    start,
    stop,
    callbacks: () => {
      if (!callbacks) throw new Error('Engine has not started')
      return callbacks
    },
  }
}

afterEach(cleanup)

describe('useSpeechToText', () => {
  it('is unsupported without an engine and does not start capturing', async () => {
    const { result } = renderHook(useSpeechToText)
    expect(result.current.isSupported).toBe(false)
    expect(result.current.status).toBe('unsupported')
    await act(() => result.current.start())
    expect(result.current.status).toBe('unsupported')
    expect(result.current.error).toBeUndefined()
  })

  it('does not start an engine that reports no support', async () => {
    const stub = stubEngine(false)
    const { result } = renderHook(useSpeechToText, { wrapper: stub.wrapper })
    expect(result.current.isSupported).toBe(false)
    expect(result.current.status).toBe('unsupported')
    await act(() => result.current.start())
    act(() => result.current.reset())
    expect(result.current.status).toBe('unsupported')
    expect(stub.start).not.toHaveBeenCalled()
  })

  it('requests permission, forwards locale and listens when start resolves', async () => {
    const stub = stubEngine()
    let resolveStart!: (stop: Stop) => void
    stub.start.mockImplementationOnce(() => new Promise((resolve) => (resolveStart = resolve)))
    const { result } = renderHook(useSpeechToText, { wrapper: stub.wrapper })
    expect(result.current.isSupported).toBe(true)
    expect(result.current.status).toBe('idle')
    expect(result.current.partialTranscript).toBe('')
    expect(result.current.finalTranscript).toBe('')
    let starting!: Promise<void>
    act(() => {
      starting = result.current.start({ locale: 'fr-FR' })
    })
    expect(result.current.status).toBe('requesting-permission')
    expect(stub.start).toHaveBeenCalledExactlyOnceWith({
      locale: 'fr-FR',
      onPartial: expect.any(Function),
      onFinal: expect.any(Function),
      onError: expect.any(Function),
    })
    await act(async () => {
      resolveStart(stub.stop)
      await starting
    })
    expect(result.current.status).toBe('listening')
    expect(stub.stop).not.toHaveBeenCalled()
  })

  it('replaces partial results and begins listening even before start resolves', async () => {
    const stub = stubEngine()
    let resolveStart!: (stop: Stop) => void
    let callbacks!: StartOptions
    stub.start.mockImplementationOnce((options) => {
      callbacks = options
      return new Promise((resolve) => (resolveStart = resolve))
    })
    const { result } = renderHook(useSpeechToText, { wrapper: stub.wrapper })
    let starting!: Promise<void>
    act(() => {
      starting = result.current.start()
    })
    act(() => callbacks.onPartial('bon'))
    expect(result.current.status).toBe('listening')
    expect(result.current.partialTranscript).toBe('bon')
    act(() => callbacks.onPartial('bonjour'))
    expect(result.current.partialTranscript).toBe('bonjour')
    expect(result.current.finalTranscript).toBe('')
    await act(async () => {
      resolveStart(stub.stop)
      await starting
    })
    expect(result.current.partialTranscript).toBe('bonjour')
  })

  it('publishes final utterances, clears partials and retains the last final on stop', async () => {
    const stub = stubEngine()
    const { result } = renderHook(useSpeechToText, { wrapper: stub.wrapper })
    await act(() => result.current.start())
    act(() => stub.callbacks().onPartial('first dra'))
    act(() => stub.callbacks().onFinal('first draft'))
    expect(result.current.finalTranscript).toBe('first draft')
    expect(result.current.partialTranscript).toBe('')
    expect(result.current.status).toBe('listening')
    act(() => stub.callbacks().onPartial('second'))
    expect(result.current.finalTranscript).toBe('first draft')
    act(() => stub.callbacks().onFinal('second utterance'))
    expect(result.current.finalTranscript).toBe('second utterance')
    expect(result.current.partialTranscript).toBe('')
    act(() => stub.callbacks().onPartial('unfinished'))
    await act(() => result.current.stop())
    expect(stub.stop).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('idle')
    expect(result.current.partialTranscript).toBe('')
    expect(result.current.finalTranscript).toBe('second utterance')
  })

  it('ignores another start while capturing and stops only once on unmount', async () => {
    const stub = stubEngine()
    const { result, unmount } = renderHook(useSpeechToText, { wrapper: stub.wrapper })
    await act(() => result.current.start())
    await act(() => result.current.start())
    expect(stub.start).toHaveBeenCalledTimes(1)
    unmount()
    expect(stub.stop).toHaveBeenCalledTimes(1)
  })

  it('does not stop an already stopped engine again on unmount', async () => {
    const stub = stubEngine()
    const { result, unmount } = renderHook(useSpeechToText, { wrapper: stub.wrapper })
    await act(() => result.current.start())
    await act(() => result.current.stop())
    unmount()
    expect(stub.stop).toHaveBeenCalledTimes(1)
  })

  it('surfaces callback errors and clears the error and partial on retry', async () => {
    const stub = stubEngine()
    const { result } = renderHook(useSpeechToText, { wrapper: stub.wrapper })
    await act(() => result.current.start())
    act(() => stub.callbacks().onPartial('unfinished'))
    act(() => stub.callbacks().onError('Microphone permission denied'))
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Microphone permission denied')
    expect(result.current.isSupported).toBe(true)
    await act(() => result.current.start())
    expect(stub.start).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('listening')
    expect(result.current.error).toBeUndefined()
    expect(result.current.partialTranscript).toBe('')
  })

  it.each([
    [new Error('Microphone unavailable'), 'Microphone unavailable'],
    ['non-Error rejection', 'Failed to start dictation'],
  ])('handles a rejected start (%s) and permits retry', async (rejection, message) => {
    const stub = stubEngine()
    stub.start.mockRejectedValueOnce(rejection)
    const { result } = renderHook(useSpeechToText, { wrapper: stub.wrapper })
    await act(() => result.current.start())
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe(message)
    await act(() => result.current.start())
    expect(stub.start).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('listening')
    expect(result.current.error).toBeUndefined()
  })

  it.each([
    [new Error('Could not release microphone'), 'Could not release microphone'],
    ['non-Error rejection', 'Failed to stop dictation'],
  ])('surfaces a rejected stop (%s)', async (rejection, message) => {
    const stub = stubEngine()
    stub.stop.mockRejectedValueOnce(rejection)
    const { result, unmount } = renderHook(useSpeechToText, { wrapper: stub.wrapper })
    await act(() => result.current.start())
    await act(() => result.current.stop())
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe(message)
    unmount()
    expect(stub.stop).toHaveBeenCalledTimes(1)
  })

  it('keeps listening through a reset that consumes a final, then stops and starts again', async () => {
    const stub = stubEngine()
    const { result } = renderHook(useSpeechToText, { wrapper: stub.wrapper })
    await act(() => result.current.start())
    act(() => stub.callbacks().onFinal('first utterance'))
    act(() => result.current.reset())
    expect(result.current.status).toBe('listening')
    expect(result.current.finalTranscript).toBe('')
    expect(stub.stop).not.toHaveBeenCalled()
    act(() => stub.callbacks().onPartial('second'))
    expect(result.current.partialTranscript).toBe('second')
    act(() => stub.callbacks().onFinal('second utterance'))
    expect(result.current.finalTranscript).toBe('second utterance')
    await act(() => result.current.stop())
    expect(stub.stop).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('idle')
    await act(() => result.current.start())
    expect(stub.start).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('listening')
  })

  it('resets transcripts and errors to a supported idle state', async () => {
    const stub = stubEngine()
    const { result } = renderHook(useSpeechToText, { wrapper: stub.wrapper })
    await act(() => result.current.start())
    act(() => {
      stub.callbacks().onFinal('last utterance')
      stub.callbacks().onPartial('unfinished')
      stub.callbacks().onError('Recognition failed')
    })
    expect(result.current.finalTranscript).toBe('last utterance')
    expect(result.current.partialTranscript).toBe('unfinished')
    expect(result.current.error).toBe('Recognition failed')
    act(() => result.current.reset())
    expect(result.current.status).toBe('idle')
    expect(result.current.partialTranscript).toBe('')
    expect(result.current.finalTranscript).toBe('')
    expect(result.current.error).toBeUndefined()
  })
})
