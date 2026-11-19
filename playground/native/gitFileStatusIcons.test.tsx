import type { CSSProperties, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { nativeDarkTheme, nativeLightTheme } from '../../src/tokens/native'
import GitFileRow from '../../src/native/compound/git/GitFileRow'
import { GIT_FILE_STATUS_ICON_VIEWS } from './gitFileStatusIconViews'

const scheme = vi.hoisted(() => ({ value: 'light' }))
vi.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: scheme.value }) }))
vi.mock('react-native', () => ({
  View: ({ children, style }: { children?: ReactNode; style?: CSSProperties }) => (
    <div style={style}>{children}</div>
  ),
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  Pressable: ({
    children,
    onLongPress,
    accessibilityLabel,
    disabled,
  }: {
    children?: ReactNode
    onLongPress?: () => void
    accessibilityLabel?: string
    disabled?: boolean
  }) => (
    <button disabled={disabled} aria-label={accessibilityLabel} data-long-press={!!onLongPress}>
      {children}
    </button>
  ),
}))
vi.mock('../../src/native/icons', () => ({
  IconDelete: () => null,
  IconDotsVertical: () => null,
  IconFastMerge: () => null,
  IconRevert: () => null,
  IconWarningTriangle: () => null,
  IconFileAdded: () => null,
  IconFileDeleted: () => null,
  IconFileModified: () => null,
}))
vi.mock('../../src/native/primitives/IconButton', () => ({ default: () => null }))
vi.mock('../../src/native/compound/ActionMenu', () => ({ default: () => null }))
vi.mock('../../src/native/primitives/Modal', () => ({ Modal: () => null }))
vi.mock('../../src/native/compound/PathDisplay', () => ({ PathDisplay: () => null }))
vi.mock('../../src/native/compound/git/GitFileStatusIcon', () => ({
  default: ({
    status,
    isConflicted,
    size = 16,
  }: {
    status?: string
    isConflicted?: boolean
    size?: number
  }) => <span data-status={status} data-conflicted={!!isConflicted} data-size={size} />,
}))

describe('native file status integration', () => {
  it.each([
    ['light', nativeLightTheme],
    ['dark', nativeDarkTheme],
  ] as const)('paints the %s showcase surface from its active theme', (colorScheme, theme) => {
    scheme.value = colorScheme
    const panel = GIT_FILE_STATUS_ICON_VIEWS[0]!.render(new URLSearchParams())
    const html = renderToStaticMarkup(panel)
    const surface = renderToStaticMarkup(<div style={{ backgroundColor: theme.surface.raised }} />)
    const expectedStyle = surface.match(/style="([^"]+)"/)![1]!
    expect(html).toContain(expectedStyle)
    for (const label of ['Added', 'Modified', 'Deleted', 'Renamed']) {
      expect(html).toContain(label)
    }
  })

  it.each(['A', 'M', 'D', 'R', '?', undefined])(
    'routes file rows with status %s through the shared dispatcher at 16 px',
    (status) => {
      const html = renderToStaticMarkup(<GitFileRow file={{ path: 'src/file.ts', status }} />)
      expect(html).toContain('data-size="16"')
      if (status) expect(html).toContain(`data-status="${status}"`)
    },
  )

  it('makes a pure rename readable and long-pressable even without a tap handler', () => {
    const html = renderToStaticMarkup(
      <GitFileRow
        file={{
          status: 'R',
          oldPath: 'src/old.ts',
          path: 'src/new.ts',
          additions: 0,
          deletions: 0,
        }}
      />,
    )
    expect(html).toContain('aria-label="src/old.ts → src/new.ts" data-long-press="true"')
    expect(html).not.toContain('disabled')
    expect(html).toContain('>old.ts<')
    expect(html).not.toMatch(/>[+−]0</)
  })

  it('forwards conflict precedence to the shared dispatcher', () => {
    const html = renderToStaticMarkup(
      <GitFileRow file={{ path: 'src/file.ts', status: 'R', isConflicted: true }} />,
    )
    expect(html).toContain('data-status="R" data-conflicted="true" data-size="16"')
  })
})
