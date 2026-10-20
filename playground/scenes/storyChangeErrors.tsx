import { Alert, Button, Modal, StoryForm } from 'thefactory-ui/web'
import { IconDelete, IconSave } from 'thefactory-ui/web/icons'
import type { Scene } from '../showcase/types'

const noop = () => {}

const DEFER_REFUSED =
  'Cannot defer "Totals dashboard" while it is in a live run and already started. Settle it when the run ends (close-features), or withdraw the work from the run first.'

const DELETE_REFUSED =
  'Cannot delete "Totals dashboard" while it is in a live run and already started. Settle it when the run ends (close-features), or withdraw the work from the run first.'

function StoryPageTop({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-2 max-w-3xl">
      <div className="flex items-center gap-3 border-b border-(--border-subtle) pb-2">
        <span className="id-chip">3</span>
        <h1 className="details-title flex-1 min-w-0">Monthly totals</h1>
      </div>
      <Alert variant="error" onDismiss={noop}>
        {message}
      </Alert>
    </div>
  )
}

export const STORY_CHANGE_ERROR_SCENES: Scene[] = [
  {
    id: 'story-change-refused',
    title: 'A story page change the backend refused',
    component: 'Alert (useStoryChangeError)',
    group: 'Process',
    description:
      'A status menu change or a feature delete on the story page that the backend refuses shows its reason under the story header, in the backend’s words, until it is put away or the next change goes through. Before, it went only to the console. Web, desktop and mobile.',
    states: [
      {
        id: 'defer-refused',
        title: 'Deferring a feature a live run started',
        render: () => <StoryPageTop message={DEFER_REFUSED} />,
      },
      {
        id: 'delete-refused',
        title: 'Deleting a feature a live run started',
        render: () => <StoryPageTop message={DELETE_REFUSED} />,
      },
    ],
  },
  {
    id: 'edit-modal-save-error',
    title: 'An edit modal whose save failed',
    component: 'StoriesModalHost (Alert on the form)',
    group: 'Process',
    description:
      'A failed save shows as an error at the top of the form, with every edit kept. The modal stays open; "Discard changes?" is asked only when leaving with unsaved edits. Web and desktop now match mobile.',
    states: [
      {
        id: 'story-save-failed',
        title: 'Saving a story while the backend is away',
        overlay: true,
        render: () => (
          <Modal
            isOpen
            onClose={noop}
            title="Edit Story"
            footer={
              <div className="flex justify-between gap-2">
                <Button variant="danger" size="icon" aria-label="Delete" title="Delete">
                  <IconDelete className="w-4 h-4" />
                </Button>
                <Button variant="secondary" size="icon" aria-label="Save" title="Save">
                  <IconSave className="w-4 h-4" />
                </Button>
              </div>
            }
          >
            <Alert variant="error" className="mb-3">
              Could not reach the backend. Check that it is running and reachable.
            </Alert>
            <StoryForm
              initialValues={{
                status: 'in_progress',
                title: 'Monthly totals — renamed',
                description: 'Show the month’s totals on the dashboard, edited before saving.',
              }}
              onSubmit={noop}
              isCreate={false}
            />
          </Modal>
        ),
      },
    ],
  },
]
