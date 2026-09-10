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
