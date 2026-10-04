import { describe, expect, it } from 'vitest'
import { InflightRequests } from './inflightRequests'

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('InflightRequests', () => {
  it('shares one request among callers asking for the same key at once', async () => {
    const requests = new InflightRequests<string>()
    const d = deferred<string>()
    let started = 0
    const start = () => {
      started += 1
      return d.promise
    }
    const a = requests.run('r1', start)
    const b = requests.run('r1', start)
    d.resolve('record')
    expect(await Promise.all([a, b])).toEqual(['record', 'record'])
    expect(started).toBe(1)
  })

  it('keeps different keys apart', async () => {
    const requests = new InflightRequests<string>()
    const a = requests.run('r1', async () => 'one')
    const b = requests.run('r2', async () => 'two')
    expect(await Promise.all([a, b])).toEqual(['one', 'two'])
  })

  it('asks again once the shared request has answered', async () => {
    const requests = new InflightRequests<number>()
    let n = 0
    expect(await requests.run('r1', async () => ++n)).toBe(1)
    expect(await requests.run('r1', async () => ++n)).toBe(2)
  })

  it('hands every caller the failure, then asks again', async () => {
    const requests = new InflightRequests<string>()
    const d = deferred<string>()
    const a = requests.run('r1', () => d.promise)
    const b = requests.run('r1', () => d.promise)
    d.reject(new Error('404'))
    await expect(a).rejects.toThrow('404')
    await expect(b).rejects.toThrow('404')
    expect(await requests.run('r1', async () => 'retried')).toBe('retried')
  })
})
