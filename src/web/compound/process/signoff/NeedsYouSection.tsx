import { runNeedsYouView, useRunNeedsYou, type ReportSectionView } from '../../../../headless'
import Markdown from '../../Markdown'
import NeedsYouCards from './NeedsYouCards'
import SignoffSection from './SignoffSection'

export type NeedsYouSectionProps = {
  section: ReportSectionView<string[]>
}

/**
 * The report's "Needs you" section. At a run's sign-off its items are cards to
 * discuss or settle, and the header says how many decisions are left; anywhere
 * else they are the report's plain list.
 */
export default function NeedsYouSection({ section }: NeedsYouSectionProps) {
  const actions = useRunNeedsYou()
  if (actions) {
    const view = runNeedsYouView(section.body, actions.resolutions)
    return (
      <SignoffSection
        title={section.title}
        summary={view.summary}
        defaultOpen={section.open}
        attention={view.attention}
      >
        <NeedsYouCards view={view} actions={actions} />
      </SignoffSection>
    )
  }
  return (
    <SignoffSection
      title={section.title}
      summary={section.summary}
      defaultOpen={section.open}
      attention={section.attention}
    >
      {section.body.length > 0 ? (
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-4 text-[13px] text-(--text-secondary)">
          {section.body.map((d) => (
            <li key={d}>
              <Markdown text={d} inline />
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-[13px] text-(--text-secondary)">Nothing is left for you.</span>
      )}
    </SignoffSection>
  )
}
