import type { SignoffDecisionInput, SignoffDecisionItem } from './signoffDecisionTypes'

/**
 * The decision card's one attention list, under the headline: the person's own
 * request first — met or not, its counted before/after pairs as thumbnail
 * chips and the fix pass that answered it as its step chip — then each section
 * to look at before deciding, with what Verify said as its action. Every item
 * is an icon, one line and chips; nothing is a text link. Pure.
 */
export function signoffDecisionItems(input: SignoffDecisionInput): SignoffDecisionItem[] {
  const { request, fix, attention } = input
  const items: SignoffDecisionItem[] = []
  if (request) {
    items.push({
      key: 'request',
      tone: request.state === 'met' ? 'done' : 'stuck',
      dependency: undefined,
      label: undefined,
      text: request.text,
      pairs: request.pairs,
      actions: [
        {
          kind: 'step',
          label: fix?.label ?? request.label,
          sectionId: fix?.sectionId ?? request.sectionId,
          step: fix?.step,
        },
      ],
    })
  }
  for (const item of attention) {
    items.push({
      key: `attention-${item.key}`,
      tone: 'working',
      dependency: item.dependency,
      label: item.label,
      text: item.text,
      pairs: [],
      actions: [{ kind: 'verify', label: item.action, sectionId: item.sectionId }],
    })
  }
  return items
}
