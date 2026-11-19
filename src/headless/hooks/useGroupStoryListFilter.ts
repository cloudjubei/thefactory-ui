import { useCallback, useState } from 'react'

import { useOptionalAppSettings } from '../contexts/AppSettingsContext'
import { GROUP_STORY_LIST_FILTER_DEFAULT } from '../utils/groupStoryConstants'
import type { GroupStoryListFilter, GroupStoryListView } from '../utils/groupStoryTypes'

type GroupStorySearch = Pick<GroupStoryListFilter, 'query' | 'projectId'>

const SEARCHES = new Map<string, GroupStorySearch>()

const VIEW_KEYS: readonly (keyof GroupStoryListView)[] = ['status', 'run', 'sortBy', 'layout']

function viewOf(filter: GroupStoryListFilter): GroupStoryListView {
  const { status, run, sortBy, layout } = filter
  return { status, run, sortBy, layout }
}

function viewChange(change: Partial<GroupStoryListFilter>): Partial<GroupStoryListView> {
  return Object.fromEntries(
    VIEW_KEYS.filter((key) => key in change).map((key) => [key, change[key]]),
  ) as Partial<GroupStoryListView>
}

/**
 * A group's Stories tab filter. Its status and run filters, order and layout
 * are remembered in the app settings, the same for every group, as the project
 * Stories view remembers its own; without app settings they last the session.
 * The search and project filter belong to one group and last the session:
 * opening a group story and coming back finds them as they were left.
 */
export function useGroupStoryListFilter(
  groupId: string,
): [GroupStoryListFilter, (change: Partial<GroupStoryListFilter>) => void] {
  const app = useOptionalAppSettings()
  const saved = app?.settings.userPreferences.groupStoriesListView
  const [sessionView, setSessionView] = useState<Partial<GroupStoryListView>>({})
  const [search, setSearch] = useState<GroupStorySearch>(
    () => SEARCHES.get(groupId) ?? { query: GROUP_STORY_LIST_FILTER_DEFAULT.query },
  )
  const setUserPreferences = app?.setUserPreferences

  const change = useCallback(
    (next: Partial<GroupStoryListFilter>) => {
      const view = viewChange(next)
      if (Object.keys(view).length > 0) {
        if (setUserPreferences) {
          setUserPreferences({
            groupStoriesListView: { ...viewOf(GROUP_STORY_LIST_FILTER_DEFAULT), ...saved, ...view },
          })
        } else {
          setSessionView((prev) => ({ ...prev, ...view }))
        }
      }
      if ('query' in next || 'projectId' in next) {
        setSearch((prev) => {
          const merged: GroupStorySearch = { ...prev }
          if ('query' in next) merged.query = next.query ?? ''
          if ('projectId' in next) {
            if (next.projectId === undefined) delete merged.projectId
            else merged.projectId = next.projectId
          }
          SEARCHES.set(groupId, merged)
          return merged
        })
      }
    },
    [groupId, saved, setUserPreferences],
  )

  return [{ ...GROUP_STORY_LIST_FILTER_DEFAULT, ...saved, ...sessionView, ...search }, change]
}
