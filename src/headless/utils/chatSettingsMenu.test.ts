import { describe, expect, it } from 'vitest'

import { chatSettingsMenuItems } from './chatSettingsMenu'
import type { ChatSettingsMenuInput } from './chatSettingsMenuTypes'

const base: ChatSettingsMenuInput = {
  canTune: true,
  showDeveloperTools: false,
  clearLabel: 'Clear messages',
  canDelete: true,
}

const keys = (input: ChatSettingsMenuInput) => chatSettingsMenuItems(input).map((i) => i.key)

describe('chatSettingsMenuItems', () => {
  it('lists the chat rows then the danger rows, without developer rows by default', () => {
    expect(keys(base)).toEqual(['tune', 'clear', 'delete'])
  })

  it('adds the four developer rows, between the chat rows and the danger rows, when the preference is on', () => {
    const items = chatSettingsMenuItems({ ...base, showDeveloperTools: true, listHidden: false })
    expect(items.map((i) => [i.key, i.section])).toEqual([
      ['tune', 'chat'],
      ['archive', 'chat'],
      ['prompt', 'developer'],
      ['costs', 'developer'],
      ['dynamic-context', 'developer'],
      ['debug', 'developer'],
      ['clear', 'danger'],
      ['delete', 'danger'],
    ])
  })

  it('shows Notify me with the chat’s level when the host knows it', () => {
    const [notify] = chatSettingsMenuItems({ ...base, notifyLevel: 'When it needs me' })
    expect(notify).toEqual({
      key: 'notify',
      label: 'Notify me',
      hint: 'When it needs me ›',
      section: 'chat',
    })
  })

  it('words an Assistant conversation’s rows as a conversation', () => {
    const labels = (listHidden: boolean) =>
      chatSettingsMenuItems({ ...base, listHidden, assistant: true })
        .filter((i) => i.key === 'archive' || i.key === 'delete')
        .map((i) => i.label)
    expect(labels(false)).toEqual(['Archive', 'Delete this conversation…'])
    expect(labels(true)).toEqual(['Move back to conversations', 'Delete this conversation…'])
  })

  it('names the archive row by whether the chat is hidden from the list', () => {
    const label = (listHidden: boolean) =>
      chatSettingsMenuItems({ ...base, listHidden }).find((i) => i.key === 'archive')?.label
    expect(label(false)).toBe('Archive from list')
    expect(label(true)).toBe('Show in list again')
  })

  it('leaves out what the chat cannot do now', () => {
    expect(keys({ canTune: false, showDeveloperTools: false, canDelete: false })).toEqual([])
  })

  it('asks before clearing, in the close action’s own words', () => {
    const clear = chatSettingsMenuItems({ ...base, clearLabel: 'Close & summarise' }).find(
      (i) => i.key === 'clear',
    )
    expect(clear?.label).toBe('Close & summarise…')
  })
})
