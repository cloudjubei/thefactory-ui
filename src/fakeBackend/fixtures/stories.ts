import type { Feature, Story } from '../../headless/api/generated/types.gen'
import { BACKEND_REQUEST, UI_REQUEST } from './featureRequests'
import { FAKE_PROJECT_ID } from './projects'
import { FAKE_AT, FAKE_STAMP } from './stamps'

const feature = (over: Pick<Feature, 'id' | 'title' | 'status'> & Partial<Feature>): Feature => ({
  description: `${over.title}.`,
  context: [],
  ...FAKE_STAMP,
  ...over,
})

export const STORY = {
  id: 's7',
  title: 'Agent-to-agent chat messaging',
  description: 'Let one agent’s chat send a message to another’s.',
  status: 'in_progress',
  features: [
    feature({ id: 'f1', title: 'Send a message', status: 'done', completedAt: FAKE_AT }),
    feature({ id: 'f2', title: 'Reply in thread', status: 'in_progress' }),
    feature({ id: 'f3', title: 'Read receipts', status: 'pending', blockers: ['f2'] }),
  ],
  ...FAKE_STAMP,
} satisfies Story

const DONE_STORY: Story = {
  id: 's6',
  title: 'Let unit tests watch their files',
  description: 'Run the tests again when a file changes.',
  status: 'done',
  features: [feature({ id: 'f4', title: 'Watch mode', status: 'done', completedAt: FAKE_AT })],
  ...FAKE_STAMP,
  completedAt: FAKE_AT,
}

const EMPTY_STORY: Story = {
  id: 's8',
  title: 'Conflict-safe editing',
  description: '',
  status: 'pending',
  features: [],
  ...FAKE_STAMP,
}

const requestStory = (storyId: string, title: string, blocker: string): Story => ({
  id: storyId,
  title,
  description: title,
  status: 'blocked',
  features: [feature({ id: `${storyId}-f1`, title, status: 'blocked', rejection: blocker })],
  blockers: [blocker],
  ...FAKE_STAMP,
})

/** A project's stories, in the order the list shows them. Any project not named here has none. */
export const FAKE_STORIES_BY_PROJECT: Record<string, Story[]> = {
  [FAKE_PROJECT_ID]: [STORY, EMPTY_STORY, DONE_STORY],
  'thefactory-backend': [
    requestStory(
      BACKEND_REQUEST.handling.storyId,
      BACKEND_REQUEST.title,
      BACKEND_REQUEST.statusReason,
    ),
  ],
  'thefactory-ui': [
    requestStory(UI_REQUEST.handling.storyId, UI_REQUEST.title, UI_REQUEST.statusReason),
  ],
}
