/** One branch the launch card offers to work off. */
export interface BaseBranchRowView {
  name: string
  /** The branch the project's checkout is on. */
  current: boolean
}

/** The launch card's choice of branch to work off, as it shows it. */
export interface BaseBranchChoiceView {
  /** The branch shown as chosen; absent when the project has none to offer. */
  picked?: string
  /** The usual bases (`dev`, `main`) and the current branch — offered first. */
  usual: BaseBranchRowView[]
  /** Every other local branch. */
  others: BaseBranchRowView[]
  /** The branch the agent asked for, when the project does not have it. */
  askedMissing?: string
}

/** The approval's metadata for the branch a launch works off — what the launch validates. */
export interface BaseBranchMetadata {
  baseBranch: string
}

/** A group launch approval's branch per project. */
export interface GroupBaseBranchMetadata {
  legBaseBranches: Record<string, string>
}
