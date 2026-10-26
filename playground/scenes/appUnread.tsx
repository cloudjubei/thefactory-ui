import { NavIndicator } from 'thefactory-ui/web'
import {
  DEFAULT_APP_SETTINGS,
  EMPTY_BADGE_STATE,
  inkBadgeLook,
  scopeRowIndicator,
  shellTabIndicator,
  ZERO_BADGE_COUNTS,
  type BadgeCounts,
  type NavRowIndicator,
} from 'thefactory-ui/headless'
import type { Scene } from '../showcase/types'

const LOOK = inkBadgeLook(DEFAULT_APP_SETTINGS.userPreferences)
const BADGE_COLORS = DEFAULT_APP_SETTINGS.notifications.badgeColors

/** One sidebar row as the web sidebar draws it: its label, then its trailing indicator. */
function Row({
  label,
  indicator,
  active = false,
  indent = false,
}: {
  label: string
  indicator: NavRowIndicator
  active?: boolean
  indent?: boolean
}) {
  return (
    <div
      className="relative flex items-center gap-2 py-2 px-3 text-left text-sm w-full"
      style={{
        background: active ? 'var(--color-brand-50)' : 'transparent',
        color: active ? 'var(--color-brand-700)' : 'inherit',
        paddingLeft: indent ? '1.75rem' : undefined,
      }}
    >
      <span className="truncate flex-1">{label}</span>
      <NavIndicator indicator={indicator} badgeColors={BADGE_COLORS} look={LOOK} />
    </div>
  )
}

/** A project's row and its Chats and App tabs, with the App tab's counts as given. */
function ProjectTabs({ counts, viewing }: { counts: Partial<BadgeCounts>; viewing: boolean }) {
  const all = { ...ZERO_BADGE_COUNTS, ...counts }
  const state = {
    ...EMPTY_BADGE_STATE,
    activity: {
      ...EMPTY_BADGE_STATE.activity,
      unseen: all.activityUnseen,
      unread: all.appUnread,
    },
  }
  return (
    <div className="w-64 rounded-lg border border-(--border-default) bg-(--surface-raised) py-1">
      <Row label="thefactory-references" indicator={scopeRowIndicator(state)} />
      <Row label="Chats" indent indicator={shellTabIndicator('chat', all, { viewing: false })} />
      <Row
        label="App"
        indent
        active={viewing}
        indicator={shellTabIndicator('app', all, { viewing })}
      />
    </div>
  )
}

export const APP_UNREAD_SCENES: Scene[] = [
  {
    id: 'app-unread',
    title: 'App tab — unread items',
    component: 'NavIndicator · shellTabIndicator · scopeRowIndicator',
    group: 'Project',
    description:
      'Work a project’s app started that came into the project — a reference an intake added — is unread until the person opens what it made. The App tab and the project’s row show it as a dot, as an unread chat shows on Chats; the dot stays while the App is open and goes once each item is opened in the app. New results and a working app outrank it.',
    states: [
      {
        id: 'unread',
        title: 'Unread in the app',
        description: 'Two references added and not opened yet: a dot on App and on the project.',
        render: () => <ProjectTabs counts={{ appUnread: 2 }} viewing={false} />,
      },
      {
        id: 'unread-viewing',
        title: 'Unread while the App is open',
        description: 'The dot stays on App while it is open, until each new reference is opened.',
        render: () => <ProjectTabs counts={{ appUnread: 1 }} viewing />,
      },
      {
        id: 'new-results-outrank',
        title: 'New results outrank unread',
        description:
          'Background work that finished since the App was opened counts on the tab; the unread dot waits behind it.',
        render: () => <ProjectTabs counts={{ appUnread: 1, activityUnseen: 2 }} viewing={false} />,
      },
      {
        id: 'all-read',
        title: 'All read',
        description: 'Nothing unread and nothing new: no indicator.',
        render: () => <ProjectTabs counts={{}} viewing={false} />,
      },
    ],
  },
]
