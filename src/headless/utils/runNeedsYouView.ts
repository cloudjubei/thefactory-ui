import { processNeedsYouItems, processNeedsYouOpenCount } from 'thefactory-tools/utils'
import type { ProcessNeedsYouItem, ProcessNeedsYouResolution } from 'thefactory-tools/types'

import {
  NEEDS_YOU_ALL_DECIDED,
  NEEDS_YOU_FINE_OUTCOME,
  NEEDS_YOU_FINE_SUMMARY,
  NEEDS_YOU_NOTHING,
  NEEDS_YOU_QUOTE_HEADING,
  NEEDS_YOU_TITLE_MAX_CHARS,
  NEEDS_YOU_TITLE_SEPARATORS,
} from './runNeedsYouViewConstants'
import type { NeedsYouCard, NeedsYouCardsView } from './runNeedsYouViewTypes'

/** An item's leading phrase as its title, when one comes first and short enough. */
function splitItem(text: string): { title: string; body: string | undefined } {
  let cut: { at: number; length: number } | undefined
  for (const separator of NEEDS_YOU_TITLE_SEPARATORS) {
    const at = text.indexOf(separator)
    if (at > 0 && at <= NEEDS_YOU_TITLE_MAX_CHARS && (!cut || at < cut.at)) {
      cut = { at, length: separator.length }
    }
  }
  if (!cut) return { title: text, body: undefined }
  const body = text.slice(cut.at + cut.length).trim()
  return body ? { title: text.slice(0, cut.at).trim(), body } : { title: text, body: undefined }
}

/** How a settled item was settled, in a line. Pure. */
export function runNeedsYouOutcome(resolution: ProcessNeedsYouResolution): string {
  const change = resolution.change
  if (change?.kind === 'feature-added') {
    return `Added “${change.title}” to this run — sign-off waits for it`
  }
  if (change?.kind === 'feature-changed') {
    return `Changed “${change.title}” and sent it back for a fix pass`
  }
  if (change?.kind === 'story-created') return `New story “${change.title}” created`
  if (resolution.kind === 'deferred') {
    return resolution.summary ? `Left for later: ${resolution.summary}` : 'Left for later'
  }
  if (!resolution.summary || resolution.summary === NEEDS_YOU_FINE_SUMMARY) {
    return NEEDS_YOU_FINE_OUTCOME
  }
  return `Decided: ${resolution.summary}`
}

function cardOf(item: ProcessNeedsYouItem): NeedsYouCard {
  return {
    id: item.id,
    text: item.text,
    ...splitItem(item.text),
    open: !item.resolution,
    outcome: item.resolution ? runNeedsYouOutcome(item.resolution) : undefined,
  }
}

/**
 * The final report's "Needs you" list as cards — each addressable by its id,
 * open until a person settles it — with the line the section's header says:
 * how many decisions are left.
 */
export function runNeedsYouView(
  needsYou: readonly string[],
  resolutions: Readonly<Record<string, ProcessNeedsYouResolution>> | undefined,
): NeedsYouCardsView {
  const items = processNeedsYouItems(needsYou, resolutions)
  const openCount = processNeedsYouOpenCount(items)
  const summary =
    items.length === 0
      ? NEEDS_YOU_NOTHING
      : openCount === 0
        ? NEEDS_YOU_ALL_DECIDED
        : `${openCount} ${openCount === 1 ? 'decision' : 'decisions'} left`
  return { cards: items.map(cardOf), openCount, summary, attention: openCount > 0 }
}

/** The run chat's draft for discussing an item: the item quoted, then a line to write on. */
export function runNeedsYouDiscussDraft(text: string): string {
  const quoted = text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
  return `> **${NEEDS_YOU_QUOTE_HEADING}**\n${quoted}\n\n`
}
