/** One run of consecutive tool-call rows drawn as a single line until opened. */
export type ToolStepGroup = {
  /** Index of its first tool-call row. */
  start: number
  /** Index just past its last tool-call row. */
  end: number
}

/** Which tool-call rows a conversation draws inside an "N steps" line. */
export type ToolStepLayout = {
  /** The fold drawn at the index of its first tool-call row. */
  starts: ReadonlyMap<number, ToolStepGroup>
  /** Tool-call rows drawn inside a fold that starts earlier. */
  hidden: ReadonlySet<number>
}
