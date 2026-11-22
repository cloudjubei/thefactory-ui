import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import {
  CREATE_FROM_TEMPLATE_COPY,
  ProjectsContext,
  ProjectsGroupsContext,
  TEMPLATE_FORK_PROGRESS_EVENT,
  TemplatesContext,
  TemplatesProvider,
  type TemplateForkProgress,
  type TemplatesContextValue,
  type UseCreateFromTemplateForm,
  useApi,
} from 'thefactory-ui/headless'
import { Button, CreateFromTemplateForm, TemplatePicker } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'
import {
  CREATE_FROM_TEMPLATE_PENDING_ROUTES,
  CREATE_FROM_TEMPLATE_ROUTES,
  CREATE_FROM_TEMPLATE_START_ROUTES,
  SHOWCASE_FORK_PROGRESS,
  SHOWCASE_FORM_PREFILL,
  SHOWCASE_GITHUB_ATTACH_DONE,
  SHOWCASE_TEMPLATES,
  showcaseGroupsValue,
  showcaseProjectsValue,
  showcaseTemplatesValue,
} from './createFromTemplateFixtures'
import { OnFixtures, type FixtureRoutes } from './onFixtures'

const FORM_ID = 'showcase-create-from-template'
const page = (node: ReactNode) => <div className="w-[640px] max-w-full p-4">{node}</div>

const FORM_SEED = {
  ...SHOWCASE_FORM_PREFILL,
  initialTemplate: SHOWCASE_TEMPLATES[0]!,
} as const

const SHOWCASE_PROJECTS = showcaseProjectsValue()
const SHOWCASE_GROUPS = showcaseGroupsValue()

const CLONING_EVENTS: readonly TemplateForkProgress[] = [SHOWCASE_FORK_PROGRESS]
const GITHUB_ATTACH_EVENTS: readonly TemplateForkProgress[] = [SHOWCASE_GITHUB_ATTACH_DONE]

type ListenedSocket = { onMessage: (message: { data: string }) => void }

function FixedTemplates({
  value,
  routes = CREATE_FROM_TEMPLATE_ROUTES,
  children,
}: {
  value: TemplatesContextValue
  routes?: FixtureRoutes
  children: ReactNode
}) {
  return (
    <OnFixtures routes={routes}>
      <ProjectsContext.Provider value={SHOWCASE_PROJECTS}>
        <ProjectsGroupsContext.Provider value={SHOWCASE_GROUPS}>
          <TemplatesContext.Provider value={value}>{children}</TemplatesContext.Provider>
        </ProjectsGroupsContext.Provider>
      </ProjectsContext.Provider>
    </OnFixtures>
  )
}

/** Real TemplatesProvider so create-from-template goes through the SDK + fixture routes. */
function LiveTemplates({ routes, children }: { routes: FixtureRoutes; children: ReactNode }) {
  return (
    <OnFixtures routes={routes}>
      <ProjectsContext.Provider value={SHOWCASE_PROJECTS}>
        <ProjectsGroupsContext.Provider value={SHOWCASE_GROUPS}>
          <TemplatesProvider>{children}</TemplatesProvider>
        </ProjectsGroupsContext.Provider>
      </ProjectsContext.Provider>
    </OnFixtures>
  )
}

/** Picker with one card selected so Verify can see selected + unselected chrome. */
function PickerCards() {
  const [selected, setSelected] = useState(SHOWCASE_TEMPLATES[0]!.id)
  return (
    <FixedTemplates value={showcaseTemplatesValue()}>
      {page(<TemplatePicker value={selected} onSelect={(template) => setSelected(template.id)} />)}
    </FixedTemplates>
  )
}

/**
 * Host chrome: form body + footer Create / Cancel, as Overseer modals compose it.
 * Footer affordances are fixed per state so the URL paints the same pixels every load.
 */
function FormHost({
  showCancel = false,
  createEnabled = true,
  createLoading = false,
  formOpts = {},
  formRef,
}: {
  showCancel?: boolean
  createEnabled?: boolean
  createLoading?: boolean
  formOpts?: Parameters<typeof CreateFromTemplateForm>[0]
  formRef?: MutableRefObject<UseCreateFromTemplateForm | null>
}) {
  return (
    <div className="flex w-[640px] max-w-full flex-col overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-raised)">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <CreateFromTemplateForm formId={FORM_ID} formRef={formRef} {...formOpts} />
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-(--border-subtle) p-3">
        {showCancel ? (
          <Button type="button" variant="secondary">
            {CREATE_FROM_TEMPLATE_COPY.abort}
          </Button>
        ) : null}
        <Button type="submit" form={FORM_ID} disabled={!createEnabled} loading={createLoading}>
          {CREATE_FROM_TEMPLATE_COPY.create}
        </Button>
      </div>
    </div>
  )
}

function IdleForm() {
  return (
    <FixedTemplates value={showcaseTemplatesValue()}>
      <FormHost formOpts={{ ...FORM_SEED }} createEnabled createLoading={false} />
    </FixedTemplates>
  )
}

/**
 * Starts the real submit once the form can, then tells the WS the progress
 * events the backend would have streamed — submitting / warning come from the
 * hook, not proof-only options.
 *
 * Heard-style: the scene stays blank until `until(form)` so a timer never
 * changes what is painted (showcase fixed-pixel rule). The form stays mounted
 * underneath so submit + fixtures can settle first.
 */
function DriveCreateFromTemplate({
  showCancel = false,
  createEnabled,
  createLoading,
  progressEvents,
  until,
}: {
  showCancel?: boolean
  createEnabled: boolean
  createLoading: boolean
  progressEvents: readonly TemplateForkProgress[]
  until: (form: UseCreateFromTemplateForm) => boolean
}) {
  const formRef = useRef<UseCreateFromTemplateForm | null>(null)
  const { ws } = useApi()
  const started = useRef(false)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    if (settled) return
    const tick = window.setInterval(() => {
      const form = formRef.current
      if (!form) return

      if (!started.current) {
        if (!form.canSubmit && !form.submitting) return
        if (form.canSubmit) {
          started.current = true
          void form.submit()
        } else {
          started.current = true
        }
      }

      const socket = ws as unknown as ListenedSocket
      for (const data of progressEvents) {
        socket.onMessage({
          data: JSON.stringify({ event: TEMPLATE_FORK_PROGRESS_EVENT, data }),
        })
      }

      if (until(form)) {
        setSettled(true)
        window.clearInterval(tick)
      }
    }, 20)
    return () => window.clearInterval(tick)
  }, [ws, progressEvents, until, settled])

  return (
    <div hidden={!settled}>
      <FormHost
        showCancel={showCancel}
        createEnabled={createEnabled}
        createLoading={createLoading}
        formOpts={{ ...FORM_SEED }}
        formRef={formRef}
      />
    </div>
  )
}

function cloningSettled(form: UseCreateFromTemplateForm) {
  return form.submitting && form.progress?.phase === 'cloning'
}

function warningSettled(form: UseCreateFromTemplateForm) {
  return !form.submitting && form.errors.length > 0
}

/**
 * POST /projects/from-template stays pending so the form is genuinely
 * submitting; cloning progress is told over the socket (same event the hook
 * listens for) so the progress line matches production.
 */
function ForkProgress({ showCancel }: { showCancel: boolean }) {
  return (
    <LiveTemplates routes={CREATE_FROM_TEMPLATE_PENDING_ROUTES}>
      <DriveCreateFromTemplate
        showCancel={showCancel}
        createEnabled={false}
        createLoading
        progressEvents={CLONING_EVENTS}
        until={cloningSettled}
      />
    </LiveTemplates>
  )
}

/** POST returns a job id; done+error WS makes the hook keep the attach warning. */
function GithubAttachWarning() {
  return (
    <LiveTemplates routes={CREATE_FROM_TEMPLATE_START_ROUTES}>
      <DriveCreateFromTemplate
        createEnabled
        createLoading={false}
        progressEvents={GITHUB_ATTACH_EVENTS}
        until={warningSettled}
      />
    </LiveTemplates>
  )
}

export const CREATE_FROM_TEMPLATE_SCENES: Scene[] = [
  {
    id: 'template-picker',
    title: 'Template picker',
    component: 'TemplatePicker',
    group: 'Project',
    description:
      'Catalog cards with difficulty, estimated time, a thumbnail when the template has one, and a letter fallback when it does not. One card selected, the others not.',
    states: [
      {
        id: 'cards',
        title: 'Cards',
        description:
          'Investment Planner selected with a thumbnail; Car Finder and Plastic-Free show letter fallbacks. Difficulty and estimated time on every card.',
        render: () => <PickerCards />,
      },
    ],
  },
  {
    id: 'create-from-template-form',
    title: 'Create from template',
    component: 'CreateFromTemplateForm',
    group: 'Project',
    description:
      'Shared create-from-template wizard: pick a template, name, collision-checked id, optional MAIN group, optional GitHub repo, fork progress, and Cancel mid-fork. Hosts put Create / Cancel in a footer via formId / formRef.',
    states: [
      {
        id: 'idle',
        title: 'Name, id and group',
        description:
          'Investment Planner selected; name, available project id, and Overseer group filled. GitHub create-repo toggle off.',
        render: () => <IdleForm />,
      },
      {
        id: 'fork-progress',
        title: 'Fork progress',
        description: 'Creating from template… with the cloning progress line.',
        render: () => <ForkProgress showCancel={false} />,
      },
      {
        id: 'cancel-mid-fork',
        title: 'Cancel mid-fork',
        description: 'Same progress UI with Cancel in the host footer while the fork runs.',
        render: () => <ForkProgress showCancel={true} />,
      },
      {
        id: 'github-attach-warning',
        title: 'GitHub attach warning',
        description:
          'After done+error: the form is idle again with the partial-success warning that the local project was created but GitHub attach failed.',
        render: () => <GithubAttachWarning />,
      },
    ],
  },
]
