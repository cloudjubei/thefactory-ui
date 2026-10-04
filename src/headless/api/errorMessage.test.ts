import { describe, expect, it } from 'vitest'
import { errorStatus } from './errorMessage'

describe('errorStatus', () => {
  it('reads the HTTP status of a failed backend call', () => {
    expect(errorStatus({ isAxiosError: true, response: { status: 404 } })).toBe(404)
  })

  it('is undefined for a call that got no response, or anything else thrown', () => {
    expect(errorStatus({ isAxiosError: true })).toBeUndefined()
    expect(errorStatus(new Error('boom'))).toBeUndefined()
    expect(errorStatus(undefined)).toBeUndefined()
  })
})
