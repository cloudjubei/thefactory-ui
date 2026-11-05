import type { ProcessProposal, ProcessProposalNode } from 'thefactory-tools/types'

import {
  CAPTURE_DEVICE_LABELS,
  CAPTURE_DEVICE_LINE,
  ONLY_WHEN_SENT_BACK_SUFFIX,
} from './processProposalViewConstants'

/** One step chip in a proposal chain — a name, and whether a model runs there. */
export interface ProposalChip {
  id: string
  name: string
  /** True iff a model runs at this step — the one place the run spends tokens. */
  agent: boolean
  /** The device a capture or verify step drives, when the host named one. */
  device?: string
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
  /**
   * How many steps across the whole plan are sure to spend a model — never those
   * of a step that runs only when work is sent back to it.
   */
  agentStepCount: number
  /** What the capture and verify steps drive, in a line, when the host named it. */
  deviceLine?: string
}

function drivesDevice(node: ProcessProposalNode): boolean {
  return (
    node.kind === 'capture' ||
    node.agentRole === 'verifier' ||
    node.agentRole === 'developer-verifier'
  )
}

/** A chip, its name saying so when the step runs only when work is sent back to it. */
function chip(node: ProcessProposalNode, device: string | undefined): ProposalChip {
  const name = node.onlyWhenSentBack ? `${node.name}${ONLY_WHEN_SENT_BACK_SUFFIX}` : node.name
  return {
    id: node.id,
    name,
    agent: node.agent,
    ...(device && drivesDevice(node) ? { device } : {}),
  }
}

function countAgents(nodes: readonly ProcessProposalNode[]): number {
  let n = 0
  for (const node of nodes) {
    if (node.onlyWhenSentBack) continue
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
  const device = proposal.captureTarget ? CAPTURE_DEVICE_LABELS[proposal.captureTarget] : undefined
  const nodeChip = (node: ProcessProposalNode) => chip(node, device)
  for (const node of proposal.steps) {
    if (node.subject?.kind === 'feature') {
      features.push({
        id: node.subject.id,
        title: node.name,
        chain: (node.children ?? []).map(nodeChip),
        ...(node.maxIterations !== undefined ? { maxIterations: node.maxIterations } : {}),
      })
      continue
    }
    tail.push(nodeChip(node))
  }
  return {
    features,
    tail,
    agentStepCount: countAgents(proposal.steps),
    ...(device ? { deviceLine: CAPTURE_DEVICE_LINE(device) } : {}),
  }
}
