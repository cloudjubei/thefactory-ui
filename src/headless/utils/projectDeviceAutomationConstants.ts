/** The record a project's device automation flag lives on, as the backend names it. */
export const PROJECT_DEVICE_AUTOMATION_RECORD = { type: 'agent-tool-sets', key: 'config' } as const

export const PROJECT_DEVICE_AUTOMATION_TEXT = {
  title: 'Device automation',
  lead: 'Let agents in this project use a phone, emulator or simulator on the machine running Overseer.',
  label: 'Agents can drive a device',
  note: 'They can boot an emulator, install the app, tap through it and take screenshots without asking each time. That includes a phone plugged into that machine.',
  loadFailed: 'Could not read this setting.',
  saveFailed: 'Could not change this setting. Try again.',
  retry: 'Try again',
} as const
