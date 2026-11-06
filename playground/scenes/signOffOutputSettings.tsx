import { useState, type ReactNode } from 'react'
import {
  SIGN_OFF_OUTPUT_COPY,
  SIGN_OFF_OUTPUTS_LAYOUT_LABELS,
  SIGN_OFF_OUTPUTS_LAYOUTS,
  signOffOutputSettingViews,
  signOffOutputsIntro,
  signOffTemplateChoices,
  type SignOffOutputFormDraft,
  type SignOffOutputOwner,
  type SignOffOutputsLayout,
} from 'thefactory-ui/headless'
import { SegmentedControl, SignOffOutputSettingsPanel } from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'

const page = (node: ReactNode) => <div className="w-[720px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>

const kept = async () => true

const GROUP_OWNER: SignOffOutputOwner = { kind: 'group', groupId: 'osc' }
const PROJECT_OWNER: SignOffOutputOwner = { kind: 'project', projectId: 'osc-web' }

const PR_TEXT = { label: 'PR Text', templateNoteId: 'pr', perRepo: true }
const SLACK = { label: 'Slack Message', templateNoteId: 'slack', perRepo: false }
const RELEASE = { label: 'Release note', templateNoteId: 'release', perRepo: false }

const GROUP_NOTES = [
  { id: 'pr', label: 'PR text template', kind: 'note' },
  { id: 'slack', label: 'Slack post template', kind: 'note' },
  { id: 'deploy-key', label: 'Deploy key', kind: 'secret' },
]
const PROJECT_NOTES = [{ id: 'release', label: 'Release note template', kind: 'note' }]
const OSC = {
  id: 'osc',
  title: 'OSC',
  type: 'MAIN' as const,
  signOffOutputs: [PR_TEXT, SLACK],
}

type PanelOptions = {
  owner?: SignOffOutputOwner
  own?: (typeof PR_TEXT)[]
  notes?: typeof GROUP_NOTES
  scopeGroup?: boolean
  loading?: boolean
  error?: string
  layout?: SignOffOutputsLayout
  openKey?: string
  draft?: SignOffOutputFormDraft
  removingKey?: string
}

function panel({
  owner = GROUP_OWNER,
  own = [PR_TEXT, SLACK],
  notes = owner.kind === 'group' ? GROUP_NOTES : PROJECT_NOTES,
  scopeGroup = false,
  loading = false,
  error,
  layout,
  openKey,
  draft,
  removingKey,
}: PanelOptions = {}) {
  const views = signOffOutputSettingViews({
    own,
    ownNotes: notes,
    notesRead: true,
    ...(owner.kind === 'project' ? { mainGroup: OSC, groupNotes: GROUP_NOTES } : {}),
  })
  return (
    <SignOffOutputSettingsPanel
      views={loading ? undefined : views}
      own={own}
      choices={signOffTemplateChoices(notes)}
      noNotes={
        owner.kind === 'group'
          ? SIGN_OFF_OUTPUT_COPY.noNotesGroup
          : SIGN_OFF_OUTPUT_COPY.noNotesProject
      }
      intro={signOffOutputsIntro(
        owner,
        owner.kind === 'group' ? (scopeGroup ? 'Client work' : 'OSC') : 'OSC web',
        scopeGroup ? 'SCOPE' : 'MAIN',
      )}
      canAdd={!scopeGroup}
      error={error ?? null}
      busy={false}
      onSave={kept}
      onRemove={kept}
      {...(layout ? { layout } : {})}
      {...(openKey ? { initialOpenKey: openKey } : {})}
      {...(draft ? { initialDraft: draft } : {})}
      {...(removingKey ? { initialRemovingKey: removingKey } : {})}
    />
  )
}

/** The three layouts on one board, with the switch above them. */
function ChooseLayout() {
  const [layout, setLayout] = useState<SignOffOutputsLayout>('rows')
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        ariaLabel="Layout"
        value={layout}
        onChange={(next) => setLayout(next as SignOffOutputsLayout)}
        options={SIGN_OFF_OUTPUTS_LAYOUTS.map((value) => ({
          value,
          label: SIGN_OFF_OUTPUTS_LAYOUT_LABELS[value],
        }))}
      />
      {panel({ layout, owner: PROJECT_OWNER, own: [RELEASE], ...foldOpen(layout) })}
    </div>
  )
}

const foldOpen = (layout: SignOffOutputsLayout) =>
  layout === 'folds' ? { openKey: 'release note' } : {}

const LAYOUT_DESCRIPTIONS: Record<SignOffOutputsLayout, string> = {
  rows: 'The default that ships. One short row per output, the same as MCP servers above it: a click opens it in a window, so Settings stays short.',
  folds:
    'A row unfolds in place, one at a time. Nothing covers the page, but an open output pushes Agent types down.',
  cards: 'Every output open at once: all fields in sight with no click, and the longest page.',
}

const layoutStates: SceneState[] = SIGN_OFF_OUTPUTS_LAYOUTS.flatMap((layout) => {
  const options = { layout, owner: PROJECT_OWNER, own: [RELEASE], ...foldOpen(layout) }
  return [
    {
      id: `layout-${layout}`,
      title: SIGN_OFF_OUTPUTS_LAYOUT_LABELS[layout],
      description: LAYOUT_DESCRIPTIONS[layout],
      render: () => page(panel(options)),
    },
    {
      id: `layout-${layout}-phone`,
      title: `${SIGN_OFF_OUTPUTS_LAYOUT_LABELS[layout]}, on a phone`,
      description: 'The small-screen width: the mobile app’s native section follows this.',
      render: () => phone(panel(options)),
    },
  ]
})

const opened = (
  id: string,
  title: string,
  description: string,
  options: PanelOptions = {},
): SceneState => ({ id, title, description, overlay: true, render: () => panel(options) })

export const SIGN_OFF_OUTPUT_SETTINGS_SCENES: Scene[] = [
  {
    id: 'sign-off-output-settings',
    title: 'Sign-off outputs in Settings',
    component: 'SignOffOutputSettingsPanel',
    group: 'Settings',
    description:
      'A group’s or a project’s sign-off outputs, in Settings → Group and → Project on all three apps: add, edit and remove them, choosing the template note and whether each is per repo. A project lists what it gets from its main group read-only, with where to change it. Three layouts; rows ship.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three layouts on one board, with the switch above them.',
        render: () => page(<ChooseLayout />),
      },
      ...layoutStates,
      {
        id: 'group',
        title: 'On a main group',
        description: 'Its own outputs: nothing here is read-only.',
        render: () => page(panel()),
      },
      {
        id: 'project-replaces',
        title: 'A project replacing one of its group’s',
        description:
          'A label both define counts once, as the project’s. The row says what it replaces.',
        render: () =>
          page(
            panel({
              owner: PROJECT_OWNER,
              own: [{ label: 'PR Text', templateNoteId: 'release', perRepo: false }],
            }),
          ),
      },
      {
        id: 'scope-group',
        title: 'On a scope group',
        description: 'A scope group’s outputs reach nobody, so it offers none to add.',
        render: () => page(panel({ scopeGroup: true, own: [] })),
      },
      { id: 'none-yet', title: 'No outputs yet', render: () => page(panel({ own: [] })) },
      { id: 'loading', title: 'Loading', render: () => page(panel({ loading: true })) },
      {
        id: 'template-gone',
        title: 'Its template note is gone',
        description: 'A run would write it with no template, so the row says so.',
        render: () => page(panel({ notes: GROUP_NOTES.slice(1) })),
      },
      {
        id: 'save-failed',
        title: 'A save failed',
        render: () =>
          page(panel({ error: 'The backend is temporarily unavailable. Try again in a moment.' })),
      },
      opened(
        'add',
        'Adding an output',
        'Secret notes are not offered: a run gets nothing from one.',
        {
          draft: { label: 'PR Text', templateNoteId: '', perRepo: true },
          own: [SLACK],
        },
      ),
      opened('add-no-notes', 'No note to choose', 'It says where to add one first.', {
        draft: { label: 'PR Text', templateNoteId: '', perRepo: true },
        notes: [],
        own: [],
      }),
      opened('add-repeated', 'A name already used', 'The backend refuses two with one name.', {
        draft: { label: ' pr text', templateNoteId: 'slack', perRepo: false },
      }),
      opened(
        'edit',
        'Editing an output',
        'Opened from its row. Remove sits here, not on the row.',
        {
          openKey: 'pr text',
        },
      ),
      opened(
        'edit-template-gone',
        'Editing one whose note is gone',
        'Save waits until another note is chosen.',
        { openKey: 'pr text', notes: GROUP_NOTES.slice(1) },
      ),
      opened(
        'from-group',
        'What a project gets from its group',
        'Read-only, with where to change it.',
        { owner: PROJECT_OWNER, own: [RELEASE], openKey: 'pr text' },
      ),
      opened('remove', 'Removing an output', 'Removing always asks first.', {
        removingKey: 'slack message',
      }),
    ],
  },
]
