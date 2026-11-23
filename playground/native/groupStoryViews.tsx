import { useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import type { GroupStoryForm, GroupStoryView } from 'thefactory-ui/headless'
import { GroupStoryFormFields } from '../../src/native/compound/groupStories/GroupStoryForm'
import GroupStoryPage from '../../src/native/compound/groupStories/GroupStoryPage'
import {
  LINKED_FORM,
  ONLY_LINKS,
  ORDERED_FORM,
  STORIES_BY_PROJECT,
  TWO_IN_UI,
  WITH_LINKS,
} from '../scenes/groupStoryFixtures'
import type { NativeView } from './views'

const noop = () => {}
const asyncNoop = async () => {}

function Phone({ children }: { children: ReactNode }) {
  return <View style={{ width: 390, maxWidth: '100%', height: 844 }}>{children}</View>
}

const PAGES: Record<string, GroupStoryView> = {
  'ordered-in-one-project': TWO_IN_UI,
  linked: WITH_LINKS,
  'only-links': ONLY_LINKS,
}

const FORMS: Record<string, GroupStoryForm> = { ordered: ORDERED_FORM, linked: LINKED_FORM }

function Form({ start }: { start: GroupStoryForm }) {
  const [form, setForm] = useState(start)
  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
      <GroupStoryFormFields form={form} onChange={setForm} storiesByProject={STORIES_BY_PROJECT} />
    </ScrollView>
  )
}

/**
 * The group story page and form on a phone, for the cases the web showcase
 * shows — `?state=ordered-in-one-project|linked|only-links` and
 * `?form=ordered|linked`.
 */
export const GROUP_STORY_VIEWS: NativeView[] = [
  {
    id: 'group-story-page',
    title: 'Group story — parts in order and linked stories',
    render: (address) => (
      <Phone>
        <GroupStoryPage
          story={PAGES[address.get('state') ?? ''] ?? TWO_IN_UI}
          onRun={noop}
          onOpenRun={noop}
          onEdit={noop}
          onDelete={asyncNoop}
          onOpenPartStory={noop}
        />
      </Phone>
    ),
  },
  {
    id: 'group-story-form',
    title: 'Group story form — ordered parts and links',
    render: (address) => (
      <Phone>
        <Form start={FORMS[address.get('form') ?? ''] ?? ORDERED_FORM} />
      </Phone>
    ),
  },
]
