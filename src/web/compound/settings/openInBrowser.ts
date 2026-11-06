/** A desktop window's `window.open` goes to the system browser through its main process. */
export function openInBrowser(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}
