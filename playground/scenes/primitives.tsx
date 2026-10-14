import { useEffect, useRef, type ReactNode } from 'react'
import {
  Alert,
  Button,
  Field,
  Input,
  Modal,
  SegmentedControl,
  Switch,
  Textarea,
  ToastProvider,
  useToast,
  type ToastMessage,
} from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'

const noop = () => {}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}

/** Raises fixed toasts once, kept until closed, so the page always shows the same stack. */
function ToastStack({ toasts }: { toasts: ToastMessage[] }) {
  const { toast } = useToast()
  const raised = useRef(false)
  useEffect(() => {
    if (raised.current) return
    raised.current = true
    toasts.forEach((t) => toast({ ...t, durationMs: 0 }))
  }, [toast, toasts])
  return null
}

const TOASTS: Record<string, ToastMessage[]> = {
  success: [
    {
      id: 'saved',
      variant: 'success',
      title: 'Story saved',
      description: 'Component showcase the Factory can screenshot',
    },
  ],
  error: [
    {
      id: 'failed',
      variant: 'error',
      title: 'Could not reach the backend',
      description: 'The request timed out after 30 seconds. Check your connection and try again.',
    },
  ],
  'with-action': [
    {
      id: 'deleted',
      variant: 'default',
      title: 'Chat deleted',
      description: 'Release planning',
      action: { label: 'Undo', onClick: noop },
    },
  ],
  stack: [
    { id: 'one', variant: 'success', title: 'Run finished' },
    {
      id: 'two',
      variant: 'warning',
      title: 'Two checks were skipped',
      description: 'No lint configured.',
    },
    { id: 'three', variant: 'error', title: 'Build failed' },
  ],
}

function toastState(id: keyof typeof TOASTS, title: string) {
  return {
    id,
    title,
    overlay: true,
    render: () => (
      <ToastProvider>
        <ToastStack toasts={TOASTS[id]!} />
      </ToastProvider>
    ),
  }
}

export const PRIMITIVE_SCENES: Scene[] = [
  {
    id: 'button',
    title: 'Button',
    component: 'Button',
    group: 'Primitives',
    description: 'Every variant and size, plus the disabled and loading states.',
    states: [
      {
        id: 'variants',
        title: 'Variants',
        render: () => (
          <Row>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
            <Button variant="run">Run</Button>
            <Button variant="handoff">Hand off</Button>
            <Button variant="link">Link</Button>
          </Row>
        ),
      },
      {
        id: 'sizes',
        title: 'Sizes',
        render: () => (
          <Row>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Add">
              +
            </Button>
          </Row>
        ),
      },
      {
        id: 'disabled',
        title: 'Disabled',
        render: () => (
          <Row>
            <Button disabled>Primary</Button>
            <Button variant="secondary" disabled>
              Secondary
            </Button>
            <Button variant="danger" disabled>
              Danger
            </Button>
          </Row>
        ),
      },
      {
        id: 'loading',
        title: 'Loading',
        description: 'The label keeps its width while the spinner sits over it.',
        render: () => (
          <Row>
            <Button loading>Saving</Button>
            <Button variant="secondary" loading>
              Loading
            </Button>
          </Row>
        ),
      },
    ],
  },
  {
    id: 'form-controls',
    title: 'Form controls',
    component: 'Field · Input · Textarea · Switch · SegmentedControl',
    group: 'Primitives',
    description: 'Inputs filled, empty, invalid and disabled; switches on and off.',
    states: [
      {
        id: 'filled',
        title: 'Filled',
        render: () => (
          <div className="flex max-w-md flex-col gap-4">
            <Field label="Story title" hint="Shown on the board and in every chat that links it.">
              <Input value="Component showcase the Factory can screenshot" onChange={noop} />
            </Field>
            <Field label="Description">
              <Textarea
                value={'Every component state at its own fixed URL.\nNo network, no timers.'}
                onChange={noop}
                rows={3}
              />
            </Field>
            <Switch checked onCheckedChange={noop} label="Notify me when it finishes" />
            <SegmentedControl
              ariaLabel="View"
              value="board"
              onChange={noop}
              options={[
                { value: 'list', label: 'List' },
                { value: 'board', label: 'Board' },
                { value: 'timeline', label: 'Timeline' },
              ]}
            />
          </div>
        ),
      },
      {
        id: 'empty-and-invalid',
        title: 'Empty and invalid',
        render: () => (
          <div className="flex max-w-md flex-col gap-4">
            <Field label="Story title">
              <Input placeholder="What should be built?" value="" onChange={noop} />
            </Field>
            <Field label="Branch" hint="A branch name cannot contain spaces.">
              <Input invalid value="my feature branch" onChange={noop} />
            </Field>
            <Switch checked={false} onCheckedChange={noop} label="Notify me when it finishes" />
          </div>
        ),
      },
      {
        id: 'disabled',
        title: 'Disabled',
        render: () => (
          <div className="flex max-w-md flex-col gap-4">
            <Field label="Project id">
              <Input disabled value="thefactory-ui" onChange={noop} />
            </Field>
            <Switch checked disabled onCheckedChange={noop} label="Managed by the group" />
          </div>
        ),
      },
    ],
  },
  {
    id: 'alert',
    title: 'Alert',
    component: 'Alert',
    group: 'Primitives',
    description: 'Inline error and info messages.',
    states: [
      {
        id: 'error',
        title: 'Error',
        render: () => <Alert>Could not save the story: the title is required.</Alert>,
      },
      {
        id: 'info',
        title: 'Info',
        render: () => (
          <Alert variant="info">This project depends on code outside its checkout.</Alert>
        ),
      },
    ],
  },
  {
    id: 'modal',
    title: 'Modal',
    component: 'Modal',
    group: 'Primitives',
    description: 'An open dialog over the page, in its sizes, with and without a footer.',
    states: [
      {
        id: 'open',
        title: 'Open with footer',
        overlay: true,
        render: () => (
          <Modal
            isOpen
            onClose={noop}
            title="Delete this chat?"
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary">Cancel</Button>
                <Button variant="danger">Delete</Button>
              </div>
            }
          >
            <p className="text-sm">
              Release planning and its 42 messages go for good. Runs it started keep going.
            </p>
          </Modal>
        ),
      },
      {
        id: 'large',
        title: 'Large, no footer',
        overlay: true,
        render: () => (
          <Modal isOpen onClose={noop} title="Keyboard shortcuts" size="xl">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="font-mono">⌘K</dt>
              <dd>Open the command palette</dd>
              <dt className="font-mono">⌘Enter</dt>
              <dd>Send the message</dd>
              <dt className="font-mono">Esc</dt>
              <dd>Close the dialog</dd>
            </dl>
          </Modal>
        ),
      },
    ],
  },
  {
    id: 'toast',
    title: 'Toast',
    component: 'ToastProvider · useToast',
    group: 'Primitives',
    description: 'Toasts held open (no auto-dismiss) so the frame is the same on every load.',
    states: [
      toastState('success', 'Success'),
      toastState('error', 'Error'),
      toastState('with-action', 'With an action'),
      toastState('stack', 'Several at once'),
    ],
  },
]
