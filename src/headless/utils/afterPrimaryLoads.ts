/**
 * Start a view's secondary read only once the reads the screen waits on are on
 * their way. React runs a commit's effects innermost first, so a provider deep
 * in the tree reading on a project switch queued its request ahead of the
 * screen's own — and the browser, a handful of connections per host, served the
 * screen last. Returns the cancel for an effect's cleanup.
 */
export function afterPrimaryLoads(load: () => void): () => void {
  const timer = setTimeout(load, 0)
  return () => clearTimeout(timer)
}
