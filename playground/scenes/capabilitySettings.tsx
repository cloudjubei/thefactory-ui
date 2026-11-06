import { capabilitySettingsView, type CapabilitySettingsView } from 'thefactory-ui/headless'
import { CapabilitySettingsPanel } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'

const noop = () => {}

const frame = (node: CapabilitySettingsView) => (
  <div className="w-[640px] max-w-full p-4">
    <CapabilitySettingsPanel
      view={node}
      error={null}
      busy={false}
      onToggle={noop}
      onInherit={noop}
    />
  </div>
)

/** A project with every power off — the default. */
const ALL_OFF = capabilitySettingsView({
  scope: 'project',
  groupTitle: 'Factory',
  toolSets: { ok: true, content: undefined },
})

/** Device automation, one tool set, one inherited flag and one project flag. */
const SOME_ON = capabilitySettingsView({
  scope: 'project',
  groupTitle: 'Factory',
  own: { autoMerge: true },
  inherited: { connectorWriteBack: true },
  toolSets: { ok: true, content: { deviceAutomation: true, toolSets: ['knowledge'] } },
})

/** A project false opts out of the group; the other flag still comes from the group. */
const FOLLOWS_GROUP = capabilitySettingsView({
  scope: 'project',
  groupTitle: 'Factory',
  own: { autoMerge: false },
  inherited: { autoMerge: true, autoFollowUp: true },
  toolSets: { ok: true, content: {} },
})

/** A main group: its flags, and device automation left to each project. */
const GROUP = capabilitySettingsView({
  scope: 'group',
  groupKind: 'MAIN',
  own: { autoFollowUp: true },
})

export const CAPABILITY_SETTINGS_SCENES: Scene[] = [
  {
    id: 'capability-settings',
    title: 'Capability settings',
    component: 'CapabilitySettingsPanel',
    group: 'Settings',
    description:
      'Project and group capability settings. Device automation, tool sets, connector write-back, auto-merge and auto-follow-up stay off until they are turned on. The badge names what is on.',
    states: [
      {
        id: 'all-off',
        title: 'All off',
        description: 'A project with nothing turned on. The badge says Off.',
        render: () => frame(ALL_OFF),
      },
      {
        id: 'some-on',
        title: 'Some on',
        description:
          'Device automation, code knowledge, connector write-back from the group, and auto-merge on this project. The badge counts them.',
        render: () => frame(SOME_ON),
      },
      {
        id: 'follows-group',
        title: 'Follows the group',
        description:
          'Auto-merge is off for this project even though the group turns it on. Auto-follow-up still comes from the group.',
        render: () => frame(FOLLOWS_GROUP),
      },
      {
        id: 'group',
        title: 'Group',
        description:
          "A main group with auto-follow-up on. Device automation and tool sets are each project's own choice.",
        render: () => frame(GROUP),
      },
    ],
  },
]
