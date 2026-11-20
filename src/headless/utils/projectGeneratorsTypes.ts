/** Why each generator cannot be saved, by its place in the list; one with nothing to say is absent. */
export type ProjectGeneratorErrors = Record<number, string[]>

/** One generator as the checks listing shows it: its name, command and what it reads and writes, as words. */
export type ProjectGeneratorLine = {
  name: string
  command: string
  reads: string[]
  writes: string[]
}
