import {
  FAKE_DATA_IN_PRODUCT_COPY,
  FAKE_DATA_IN_PRODUCT_OPTIONS,
  fakeDataInProductLine,
  readProcessFakeDataInProduct,
  withProcessFakeDataInProduct,
  type FakeDataInProduct,
} from '../../../headless'
import SegmentedControl from '../../primitives/SegmentedControl'

export type ProjectFakeDataInProductFieldProps = {
  /** The project's metadata. */
  metadata: Record<string, unknown>
  /** The metadata with the choice as edited. */
  onChange: (metadata: Record<string, unknown>) => void
  busy?: boolean
}

/** Whether a project's fake-data code ships with the work: where every launch's choice starts. */
export default function ProjectFakeDataInProductField({
  metadata,
  onChange,
  busy = false,
}: ProjectFakeDataInProductFieldProps) {
  const value = readProcessFakeDataInProduct(metadata.processFakeDataInProduct)
  return (
    <fieldset disabled={busy} className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-(--text-primary)">
          {FAKE_DATA_IN_PRODUCT_COPY.title}
        </span>
        <span className="text-[12px] text-(--text-secondary)">
          {FAKE_DATA_IN_PRODUCT_COPY.projectHint}
        </span>
      </div>
      <SegmentedControl
        size="sm"
        ariaLabel={FAKE_DATA_IN_PRODUCT_COPY.title}
        className="self-start"
        value={value}
        onChange={(next) =>
          onChange(withProcessFakeDataInProduct(metadata, next as FakeDataInProduct))
        }
        options={FAKE_DATA_IN_PRODUCT_OPTIONS.map(({ value: v, label }) => ({ value: v, label }))}
      />
      <span className="text-[12px] text-(--text-secondary)">{fakeDataInProductLine(value)}</span>
    </fieldset>
  )
}
