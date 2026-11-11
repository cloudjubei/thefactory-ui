import qrcode from 'qrcode-generator'
import { QR_CODE_QUIET_MODULES } from './qrCodePathConstants'
import type { QrCodePath } from './qrCodePathTypes'

function utf8Binary(value: string): string {
  return encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  )
}

/**
 * A QR code for `value`, as one SVG path both web and native draw: each run of dark modules in a
 * row is one rectangle. `undefined` for an empty value or one too long for any code.
 */
export function qrCodePath(value: string): QrCodePath | undefined {
  if (!value) return undefined
  const code = qrcode(0, 'M')
  try {
    code.addData(utf8Binary(value), 'Byte')
    code.make()
  } catch {
    return undefined
  }
  const modules = code.getModuleCount()
  const segments: string[] = []
  for (let y = 0; y < modules; y += 1) {
    let x = 0
    while (x < modules) {
      if (!code.isDark(y, x)) {
        x += 1
        continue
      }
      const start = x
      while (x < modules && code.isDark(y, x)) x += 1
      const run = x - start
      segments.push(`M${start} ${y}h${run}v1h-${run}z`)
    }
  }
  const side = modules + 2 * QR_CODE_QUIET_MODULES
  return {
    modules,
    viewBox: `${-QR_CODE_QUIET_MODULES} ${-QR_CODE_QUIET_MODULES} ${side} ${side}`,
    path: segments.join(''),
  }
}
