let stopCurrent: (() => void) | null = null

/**
 * One video plays at a time: taking the turn stops the one that held it. Gives back what lets the
 * turn go, which does nothing once another video has taken it.
 */
export function takeVideoTurn(stop: () => void): () => void {
  if (stopCurrent !== stop) stopCurrent?.()
  stopCurrent = stop
  return () => {
    if (stopCurrent === stop) stopCurrent = null
  }
}
