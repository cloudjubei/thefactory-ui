/**
 * Calls `flush` as the page is being hidden or closed — tab switch, window
 * close, reload, or the desktop renderer going away — so debounced writes
 * (e.g. chat drafts) reach storage first. Pass it as `ChatsProvider`'s
 * `subscribeAppHidden`. Returns the unsubscribe.
 */
export function subscribePageHidden(flush: () => void): () => void {
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') flush()
  }
  window.addEventListener('pagehide', flush)
  window.addEventListener('beforeunload', flush)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    window.removeEventListener('pagehide', flush)
    window.removeEventListener('beforeunload', flush)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
