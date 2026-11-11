import qrcode from 'qrcode-generator'
import { describe, expect, it } from 'vitest'
import { qrCodePath } from './qrCodePath'
import { QR_CODE_QUIET_MODULES } from './qrCodePathConstants'

const runs = (path: string) => path.match(/M\d+ \d+h\d+v1h-\d+z/g) ?? []

describe('qrCodePath', () => {
  it('draws a short value as the smallest code, one rectangle per run of dark modules', () => {
    const code = qrCodePath('hi')!
    expect(code.modules).toBe(21)
    expect(code.viewBox).toBe(
      `${-QR_CODE_QUIET_MODULES} ${-QR_CODE_QUIET_MODULES} ${21 + 2 * QR_CODE_QUIET_MODULES} ${21 + 2 * QR_CODE_QUIET_MODULES}`,
    )
    expect(code.path.startsWith('M0 0h7v1h-7z')).toBe(true)
    expect(runs(code.path).join('')).toBe(code.path)
  })

  it('places the three finder squares in their corners', () => {
    const code = qrCodePath('hi')!
    expect(code.path).toContain('M14 0h7v1h-7z')
    expect(code.path).toContain('M0 20h7v1h-7z')
  })

  it('grows with what it carries', () => {
    const url =
      'http://192.168.1.20:7001/api/v1/process-runs/r1/try-build/app.apk?viewToken=eyJhbGciOiJIUzI1NiJ9.abcdefabcdef'
    expect(qrCodePath(url)!.modules).toBe(45)
  })

  it('carries text beyond ASCII as its UTF-8 bytes', () => {
    const dark = (data: string) => {
      const code = qrcode(0, 'M')
      code.addData(data, 'Byte')
      code.make()
      return Array.from({ length: code.getModuleCount() }, (_, x) => (code.isDark(8, x) ? 1 : 0))
    }
    const row = (value: string) =>
      Array.from({ length: qrCodePath(value)!.modules }, (_, x) =>
        runs(qrCodePath(value)!.path).some((r) => {
          const [, sx, sy, n] = r.match(/M(\d+) (\d+)h(\d+)/)!.map(Number)
          return sy === 8 && x >= sx && x < sx + n
        })
          ? 1
          : 0,
      )
    expect(row('é')).toEqual(dark('\u00c3\u00a9'))
    expect(row('é')).not.toEqual(dark('é'))
  })

  it('is nothing for an empty value or one too long for any code', () => {
    expect(qrCodePath('')).toBeUndefined()
    expect(qrCodePath('x'.repeat(5000))).toBeUndefined()
  })
})
