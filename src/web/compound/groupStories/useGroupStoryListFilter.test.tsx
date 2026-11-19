// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { AppSettingsProvider } from '../../../headless/contexts/AppSettingsContext'
import { useGroupStoryListFilter } from '../../../headless/hooks/useGroupStoryListFilter'
import type { SyncKVStorage } from '../../../headless/hooks/useStorageBackedState'
import { GROUP_STORY_LIST_FILTER_DEFAULT } from '../../../headless/utils/groupStoryConstants'

/**
 * Mounts the headless hook. The test lives under web because headless code
 * cannot import react-dom.
 */

function memoryStorage(): SyncKVStorage & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    get: (key) => values.get(key) ?? null,
    set: (key, value) => {
      values.set(key, value)
    },
  }
}

function mount(groupId: string, storage: SyncKVStorage) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppSettingsProvider storage={storage}>{children}</AppSettingsProvider>
  )
  return renderHook(() => useGroupStoryListFilter(groupId), { wrapper })
}

describe('useGroupStoryListFilter', () => {
  afterEach(() => {
    cleanup()
  })

  it('starts from the default view', () => {
    const { result } = mount('g-fresh', memoryStorage())
    expect(result.current[0]).toEqual(GROUP_STORY_LIST_FILTER_DEFAULT)
  })

  it('remembers status, run, order and layout in the app settings, as the project stories do', () => {
    const storage = memoryStorage()
    const first = mount('g-saved', storage)
    act(() =>
      first.result.current[1]({
        status: 'not-done',
        run: 'needs-you',
        sortBy: 'status_asc',
        layout: 'board',
      }),
    )
    first.unmount()

    const again = mount('g-other', storage)
    expect(again.result.current[0]).toMatchObject({
      status: 'not-done',
      run: 'needs-you',
      sortBy: 'status_asc',
      layout: 'board',
    })
  })

  it('keeps the search and project filter for its own group, for the session only', () => {
    const storage = memoryStorage()
    const first = mount('g-search', storage)
    act(() => first.result.current[1]({ query: 'serve', projectId: 'p1' }))
    first.unmount()

    expect(mount('g-search', storage).result.current[0]).toMatchObject({
      query: 'serve',
      projectId: 'p1',
    })
    expect(mount('g-elsewhere', storage).result.current[0]).toMatchObject({ query: '' })
    expect(mount('g-elsewhere', storage).result.current[0].projectId).toBeUndefined()
    expect([...storage.values.values()].join('')).not.toContain('serve')
  })

  it('still filters for the session without app settings', () => {
    const { result } = renderHook(() => useGroupStoryListFilter('g-bare'))
    act(() => result.current[1]({ status: 'not-done' }))
    expect(result.current[0].status).toBe('not-done')
  })
})
