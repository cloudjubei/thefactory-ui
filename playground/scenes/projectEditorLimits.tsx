import { useState, type FormEvent } from 'react'
import {
  GitCredentialsProvider,
  LAUNCH_CAPS_COPY,
  ProviderConnectionsProvider,
} from 'thefactory-ui/headless'
import {
  Button,
  ProjectEditorForm,
  SegmentedControl,
  projectToFormState,
  type ProjectFormState,
} from 'thefactory-ui/web'
import { IconSave } from 'thefactory-ui/web/icons'
import { FAKE_PROJECTS } from '../../src/fakeBackend/fixtures/projects'
import { Acted, OnFixtures, type FixtureRoutes, type SceneStep } from './onFixtures'
import type { Scene } from '../showcase/types'

const FORM_ID = 'project-editor-limits'
const ATTEMPTS_ERROR = LAUNCH_CAPS_COPY.defaultBlocked('Attempts', LAUNCH_CAPS_COPY.invalidWhole)

const ROUTES: FixtureRoutes = { '/api/v1/git-credentials': () => [] }

const STARTING: ProjectFormState = projectToFormState({
  ...FAKE_PROJECTS[0],
  metadata: { processDefaultCaps: { spendUsdCap: 10, maxIterations: 2 } },
} as Parameters<typeof projectToFormState>[0])

const TYPE_ZERO: SceneStep = { fill: 'Attempts', value: '0' }
const SAVE: SceneStep = { press: 'Save' }

/** The project editor as its modal holds it: a form that scrolls, Save in a band below it. */
function Editor({
  steps,
  formErrors = [],
}: {
  steps: readonly SceneStep[]
  formErrors?: readonly string[]
}) {
  const [form, setForm] = useState(STARTING)
  const [saved, setSaved] = useState('Nothing saved yet')
  const save = (event: FormEvent) => {
    event.preventDefault()
    setSaved(`Saved: ${JSON.stringify(form.metadata.processDefaultCaps ?? null)}`)
  }
  return (
    <OnFixtures routes={ROUTES}>
      <GitCredentialsProvider>
        <ProviderConnectionsProvider>
          <Acted steps={steps}>
            <div className="flex h-[560px] w-full max-w-[560px] flex-col overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-raised)">
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <ProjectEditorForm
                  mode="edit"
                  form={form}
                  setForm={setForm}
                  formErrors={[...formErrors]}
                  formId={FORM_ID}
                  onSubmit={save}
                />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-(--border-subtle) p-3">
                <code className="text-[11px] text-(--text-muted)">{saved}</code>
                <Button
                  type="submit"
                  form={FORM_ID}
                  variant="secondary"
                  size="icon"
                  title="Save"
                  aria-label="Save"
                >
                  <IconSave className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Acted>
        </ProviderConnectionsProvider>
      </GitCredentialsProvider>
    </OnFixtures>
  )
}

type BlockedShows = 'jump' | 'note'

const BLOCKED_SHOWS: { value: BlockedShows; label: string }[] = [
  { value: 'jump', label: 'Jump to the limit' },
  { value: 'note', label: 'Note at the top' },
]

function Options() {
  const [shows, setShows] = useState<BlockedShows>('jump')
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        size="sm"
        ariaLabel="What a blocked save shows"
        value={shows}
        onChange={(value) => setShows(value as BlockedShows)}
        options={BLOCKED_SHOWS}
        className="w-fit"
      />
      {shows === 'jump' ? (
        <Editor key="jump" steps={[TYPE_ZERO, SAVE]} />
      ) : (
        <Editor key="note" steps={[TYPE_ZERO]} formErrors={[ATTEMPTS_ERROR]} />
      )}
    </div>
  )
}

export const PROJECT_EDITOR_LIMIT_SCENES: Scene[] = [
  {
    id: 'project-editor-limits',
    title: 'A limit that cannot be saved',
    component: 'ProjectEditorForm',
    group: 'Project',
    description:
      'A default limit in error stops the save, and nothing changes on the project. The limits sit low in a long form while Save sits below it, so a blocked save brings the limit to the person: Jump to the limit ships. The line beside Save says what the host would have saved.',
    states: [
      {
        id: 'choose',
        title: 'Pick what a blocked save shows',
        description:
          'Jump to the limit ships: the form scrolls to the bad limit, the cursor is in it, the reason is under it. Note at the top lists it with the form’s other errors, as a check’s setting does.',
        render: () => <Options />,
      },
      {
        id: 'blocked',
        title: 'Save blocked',
        description:
          'Attempts holds 0. Save was pressed: nothing is saved, the form is at the limit.',
        render: () => <Editor steps={[TYPE_ZERO, SAVE]} />,
      },
      {
        id: 'fixed',
        title: 'Fixed, then saved',
        description: 'The same limit put right: the next Save goes through with the new value.',
        render: () => <Editor steps={[TYPE_ZERO, SAVE, { fill: 'Attempts', value: '4' }, SAVE]} />,
      },
    ],
  },
]
