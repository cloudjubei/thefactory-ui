// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { APP_NOTE_SEND_SCENES } from './appNoteSend'

afterEach(cleanup)

describe('app note send scene', () => {
  it('sends one note to the launching chat and reads it back from the fake backend', async () => {
    const state = APP_NOTE_SEND_SCENES[0]?.states[0]
    if (!state) throw new Error('The app note send scene has no state')
    const view = render(state.render())
    await waitFor(() => expect(view.getByText('Sent to the launching chat')).toBeTruthy(), {
      timeout: 10000,
    })
    expect(view.getByText('Look at the renewal date.')).toBeTruthy()
    expect(view.getByText('#renewal')).toBeTruthy()
    expect(view.getByText('Make the renewal date easier to find.')).toBeTruthy()
  })
})
