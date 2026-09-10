/**
 * Save a data URI as a file from the browser. Evidence is fetched through the
 * bearer-authenticated API and held as a data URI, so there is no URL a plain
 * link could point at — the save has to be started from the bytes we hold.
 */
export function downloadDataUri(dataUri: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataUri
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/** Gap between the two frames on a saved sheet, and the mat they sit on. */
const SHEET_GAP = 16
const SHEET_MAT = '#ffffff'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('could not decode the capture'))
    img.src = src
  })
}

/**
 * Save a before/after pair as ONE side-by-side sheet.
 *
 * The pair is the unit of evidence — two separate downloads hand the reader the
 * job of reassembling what the overlay had just put side by side. Frames are
 * matched on height so the comparison survives the export, and a pair with only
 * one side saves that side alone rather than half an empty sheet.
 */
export async function saveSideBySide(
  before: string | undefined,
  after: string | undefined,
  filename: string,
): Promise<void> {
  const sources = [before, after].filter((s): s is string => typeof s === 'string')
  if (sources.length === 0) return
  if (sources.length === 1) {
    downloadDataUri(sources[0], filename)
    return
  }
  try {
    const images = await Promise.all(sources.map(loadImage))
    const height = Math.max(...images.map((i) => i.naturalHeight))
    const scaled = images.map((i) => ({
      img: i,
      width: Math.round((i.naturalWidth * height) / i.naturalHeight),
    }))
    const width = scaled.reduce((sum, s) => sum + s.width, 0) + SHEET_GAP * (scaled.length - 1)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    ctx.fillStyle = SHEET_MAT
    ctx.fillRect(0, 0, width, height)
    let x = 0
    for (const s of scaled) {
      ctx.drawImage(s.img, x, 0, s.width, height)
      x += s.width + SHEET_GAP
    }
    downloadDataUri(canvas.toDataURL('image/png'), filename)
  } catch {
    // Compositing is a convenience, not the evidence. If the canvas refuses
    // (a tainted or undecodable capture), still hand over both frames rather
    // than failing the save silently.
    for (const [i, src] of sources.entries()) {
      downloadDataUri(src, filename.replace(/\.png$/, `-${i === 0 ? 'before' : 'after'}.png`))
    }
  }
}
