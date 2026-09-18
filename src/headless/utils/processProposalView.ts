import type { ProcessProposal, ProcessProposalNode } from 'thefactory-tools/types'

/** One step chip in a proposal chain — a name, and whether a model runs there. */
export interface ProposalChip {
  id: string
  name: string
  /** True iff a model runs at this step — the one place the run spends tokens. */
  agent: boolean
}

/** One feature row of the proposal: the feature, and the pipeline it will run through. */
export interface ProposalFeatureRow {
  id: string
  title: string
  /** The nested pipeline, in order. Empty when the definition could not be resolved. */
  chain: ProposalChip[]
  /** Retries per feature, when the feature process loops. */
  maxIterations?: number
}

/**
 * The proposal, arranged for the launch dock: one row per feature with its
 * pipeline, then the story-level tail (the sign-off gate), and the count of
 * steps where a model actually runs — the honest cost shape.
 */
export interface ProcessProposalView {
  features: ProposalFeatureRow[]
  /** Story-level steps that are not a feature expansion — the sign-off gate, a report. */
  tail: ProposalChip[]
  /** How many steps across the whole plan spend a model. */
  agentStepCount: number
}

function chip(node: ProcessProposalNode): ProposalChip {
  return { id: node.id, name: node.name, agent: node.agent }
}

function countAgents(nodes: readonly ProcessProposalNode[]): number {
  let n = 0
  for (const node of nodes) {
    if (node.agent) n += 1
    if (node.children) n += countAgents(node.children)
  }
  return n
}

/**
 * Arrange a proposal for rendering.
 *
 * A feature node is any node bound to a feature subject; its `children` are the
 * pipeline that feature runs through. Everything else at the top level is the
 * tail — the sign-off gate, chiefly — shown once, after the features, because it
 * runs once for the whole story.
 */
export function processProposalView(proposal: ProcessProposal): ProcessProposalView {
  const features: ProposalFeatureRow[] = []
  const tail: ProposalChip[] = []
  for (const node of proposal.steps) {
    if (node.subject?.kind === 'feature') {
      features.push({
        id: node.subject.id,
        title: node.name,
        chain: (node.children ?? []).map(chip),
        ...(node.maxIterations !== undefined ? { maxIterations: node.maxIterations } : {}),
      })
      continue
    }
    tail.push(chip(node))
  }
  return { features, tail, agentStepCount: countAgents(proposal.steps) }
}
