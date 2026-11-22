// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CREATE_FROM_TEMPLATE_COPY,
  TEMPLATE_FORK_PHASE_LABEL,
} from '../../src/headless/utils/createFromTemplateConstants'
import { CREATE_FROM_TEMPLATE_SCENES } from './createFromTemplate'
import { SHOWCASE_GITHUB_ATTACH_WARNING } from './createFromTemplateFixtures'

afterEach(cleanup)

function renderFormState(stateId: string) {
  const scene = CREATE_FROM_TEMPLATE_SCENES.find((s) => s.id === 'create-from-template-form')
  const state = scene?.states.find((s) => s.id === stateId)
  if (!state) throw new Error(`missing create-from-template-form/${stateId}`)
  return render(<>{state.render()}</>)
}

describe('create-from-template showcase settle gate', () => {
  it('holds fork-progress blank until Cloning template… is settled', async () => {
    renderFormState('fork-progress')

    expect(screen.queryByText(TEMPLATE_FORK_PHASE_LABEL.cloning)).toBeNull()
    expect(screen.queryByText(CREATE_FROM_TEMPLATE_COPY.creating)).toBeNull()

    expect(await screen.findByText(TEMPLATE_FORK_PHASE_LABEL.cloning)).toBeTruthy()
    expect(screen.getByText(CREATE_FROM_TEMPLATE_COPY.creating)).toBeTruthy()
  })

  it('holds cancel-mid-fork blank until Cancel is settled with cloning progress', async () => {
    renderFormState('cancel-mid-fork')

    expect(screen.queryByRole('button', { name: CREATE_FROM_TEMPLATE_COPY.abort })).toBeNull()

    expect(
      await screen.findByRole('button', { name: CREATE_FROM_TEMPLATE_COPY.abort }),
    ).toBeTruthy()
    expect(screen.getByText(TEMPLATE_FORK_PHASE_LABEL.cloning)).toBeTruthy()
  })

  it('holds github-attach-warning blank until the attach warning is settled', async () => {
    renderFormState('github-attach-warning')

    expect(screen.queryByText(SHOWCASE_GITHUB_ATTACH_WARNING)).toBeNull()

    expect(await screen.findByText(SHOWCASE_GITHUB_ATTACH_WARNING)).toBeTruthy()
    expect(screen.queryByText(CREATE_FROM_TEMPLATE_COPY.creating)).toBeNull()
  })
})
