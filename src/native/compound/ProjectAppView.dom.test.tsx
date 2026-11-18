import { createRef, useImperativeHandle, useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProjectAppView, { type ProjectAppViewHandle } from './ProjectAppView'

const native = vi.hoisted(() => ({
  inject: vi.fn<(script: string) => void>(),
  loadEnd: undefined as undefined | (() => void),
  message: undefined as undefined | ((event: { nativeEvent: { data: string } }) => void),
}))
// Keep NativeWind's native runtime out of jsdom while exercising the real theme hook.
vi.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }))
vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Pressable: ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => (
    <button onClick={onPress}>{children}</button>
  ),
}))
vi.mock('react-native-webview', () => ({
  WebView: ({
    ref,
    onMessage,
    onLoadEnd,
  }: {
    ref: React.Ref<unknown>
    onMessage: typeof native.message
    onLoadEnd: () => void
  }) => {
    useImperativeHandle(ref, () => ({ injectJavaScript: native.inject }), [])
    native.message = onMessage
    native.loadEnd = onLoadEnd
    return <div />
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const PICK = { selector: '#renewal', outerHtml: '<p id="renewal">Renews November 20</p>' }

function injectedMessages() {
  return native.inject.mock.calls.map(([script]: [string]) =>
    JSON.parse(JSON.parse(script.split('data:')[1].split('}));')[0])),
  )
}

async function postPick(payload: unknown = PICK) {
  await act(async () => {
    native.message!({
      nativeEvent: { data: JSON.stringify({ type: 'overseer:pick.selected', payload }) },
    })
  })
}

describe('native ProjectAppView picker lifecycle', () => {
  it('delivers valid JSON picks only while active, using the latest callback', async () => {
    const onPick = vi.fn()
    const latestPick = vi.fn()
    const dispatcher = vi.fn()
    const { rerender } = render(
      <ProjectAppView
        url="https://app.test/view"
        onElementPick={onPick}
        onBridgeMessage={dispatcher}
      />,
    )
    await postPick()
    expect(onPick).not.toHaveBeenCalled()
    expect(dispatcher).not.toHaveBeenCalled()
    rerender(<ProjectAppView url="https://app.test/view" pickMode onElementPick={onPick} />)
    expect(screen.getByText('Pick elements to comment in your chat')).toBeTruthy()
    expect(injectedMessages().at(-1)).toEqual({
      type: 'overseer:pick.set',
      payload: { active: true },
    })
    await postPick()
    expect(onPick).toHaveBeenCalledExactlyOnceWith(PICK)
    await postPick({ selector: '', outerHtml: PICK.outerHtml })
    await act(async () => {
      native.message!({ nativeEvent: { data: 'not JSON' } })
    })
    expect(onPick).toHaveBeenCalledTimes(1)
    rerender(<ProjectAppView url="https://app.test/view" pickMode onElementPick={latestPick} />)
    await postPick()
    expect(latestPick).toHaveBeenCalledExactlyOnceWith(PICK)
    expect(onPick).toHaveBeenCalledTimes(1)
    rerender(<ProjectAppView url="https://app.test/view" onElementPick={latestPick} />)
    expect(screen.queryByText('Pick elements to comment in your chat')).toBeNull()
    expect(injectedMessages().at(-1)).toEqual({
      type: 'overseer:pick.set',
      payload: { active: false },
    })
    await postPick()
    expect(latestPick).toHaveBeenCalledTimes(1)
  })

  it('resynchronizes on load end and remount, and Done exits the controlled mode', async () => {
    const onPick = vi.fn()
    const onExit = vi.fn()
    function Host({ remountKey = 0 }: { remountKey?: number }) {
      const [active, setActive] = useState(true)
      return (
        <ProjectAppView
          url="https://app.test/view"
          remountKey={remountKey}
          pickMode={active}
          onElementPick={onPick}
          onExitPickMode={() => {
            onExit()
            setActive(false)
          }}
        />
      )
    }
    const { rerender } = render(<Host />)
    native.inject.mockClear()
    act(() => native.loadEnd!())
    expect(injectedMessages()).toEqual([{ type: 'overseer:pick.set', payload: { active: true } }])
    native.inject.mockClear()
    rerender(<Host remountKey={1} />)
    expect(injectedMessages().at(-1)).toEqual({
      type: 'overseer:pick.set',
      payload: { active: true },
    })
    await postPick()
    expect(onPick).toHaveBeenCalledExactlyOnceWith(PICK)
    fireEvent.click(screen.getByRole('button', { name: 'Done picking' }))
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Done picking' })).toBeNull()
    native.inject.mockClear()
    act(() => native.loadEnd!())
    expect(injectedMessages()).toEqual([{ type: 'overseer:pick.set', payload: { active: false } }])
    await postPick()
    expect(onPick).toHaveBeenCalledTimes(1)
  })
})

describe('native ProjectAppView captureHtml', () => {
  it('injects a correlated bridge request and receives the native JSON response even without an app dispatcher', async () => {
    const ref = createRef<ProjectAppViewHandle>()
    const { unmount } = render(<ProjectAppView ref={ref} url="https://app.test/view" />)
    const pending = ref.current!.captureHtml()
    const script = native.inject.mock.lastCall![0] as string
    expect(script).toContain('overseer:capture-html')
    // Decode the nested JSON used by the native delivery script, not arbitrary JavaScript.
    const data = script.split('data:')[1].split('}));')[0]
    const request = JSON.parse(JSON.parse(data))
    await act(async () => {
      native.message!({
        nativeEvent: {
          data: JSON.stringify({
            overseerBridgeResponse: true,
            id: request.id,
            ok: true,
            result: { html: '<html>native current view</html>' },
          }),
        },
      })
      await pending
    })
    await expect(pending).resolves.toBe('<html>native current view</html>')
    const cancelled = expect(ref.current!.captureHtml()).rejects.toThrow('closed or navigated')
    unmount()
    await cancelled
  })
})
