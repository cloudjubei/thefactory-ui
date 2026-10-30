/** One plain value of a project's live check env, as its editor holds it. */
export type ProjectCheckEnvValueRow = { name: string; value: string }

/** One secret of a project's live check env: its variable and the secret note it is read from. */
export type ProjectCheckEnvSecretRow = { name: string; noteId: string }

/** A project's live check env as its editor holds it: rows, in order, possibly incomplete. */
export type ProjectCheckEnvRows = {
  values: ProjectCheckEnvValueRow[]
  secrets: ProjectCheckEnvSecretRow[]
}

/** Why each row cannot be saved, by position; `undefined` for a row that can. */
export type ProjectCheckEnvRowErrors = {
  values: (string | undefined)[]
  secrets: (string | undefined)[]
}
