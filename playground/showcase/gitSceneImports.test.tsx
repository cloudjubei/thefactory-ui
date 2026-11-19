import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { GIT_FILE_STATUS_ICON_SCENES } from '../scenes/gitFileStatusIcons'
import { GIT_RENAMED_ROWS_SCENES } from '../scenes/gitRenamedRows'

vi.mock('thefactory-ui/web', () => ({
  GitFileRow: () => <span data-public-export="GitFileRow" />,
  GitFileStatusIcon: () => <span data-public-export="GitFileStatusIcon" />,
}))

it.each([
  ['GitFileRow', GIT_RENAMED_ROWS_SCENES],
  ['GitFileStatusIcon', GIT_FILE_STATUS_ICON_SCENES],
] as const)('renders %s through the public web entry point', (component, scenes) => {
  for (const scene of scenes) {
    for (const state of scene.states) {
      expect(renderToStaticMarkup(<>{state.render()}</>), `${scene.id}/${state.id}`).toContain(
        `data-public-export="${component}"`,
      )
    }
  }
})
