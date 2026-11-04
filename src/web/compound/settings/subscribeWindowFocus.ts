/** Calls `onFocus` when the person comes back to this tab or window. Returns the unsubscribe. */
export function subscribeWindowFocus(onFocus: () => void): () => void {
  const onVisibility = () => {
    if (document.visibilityState === 'visible') onFocus()
  }
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
