import { WORK_FILES_LABEL } from './workFilesConstants'

/** The heading over the files handed over with work: how many there are. */
export function workFilesHeading(count: number): string {
  return `${WORK_FILES_LABEL} · ${count}`
}
