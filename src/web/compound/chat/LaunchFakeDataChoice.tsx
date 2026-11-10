import {
  FAKE_DATA_IN_PRODUCT_COPY,
  FAKE_DATA_IN_PRODUCT_OPTIONS,
  fakeDataInProductLine,
  type FakeDataInProduct,
} from '../../../headless'
import SegmentedControl from '../../primitives/SegmentedControl'

export type LaunchFakeDataChoiceProps = {
  value: FakeDataInProduct
  onChange: (value: FakeDataInProduct) => void
  busy?: boolean
}

/**
 * The launch card's "Fake data in the product": whether the code that makes the app's fake data
 * possible ships with the work or stays out of what is committed. Starts from the project's
 * setting; the person's pick goes with the launch. Native peer:
 * `native/compound/chat/LaunchFakeDataChoice`.
 */
export default function LaunchFakeDataChoice({
  value,
  onChange,
  busy = false,
}: LaunchFakeDataChoiceProps) {
  return (
    <fieldset disabled={busy} className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1.5 p-0 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {FAKE_DATA_IN_PRODUCT_COPY.title}
      </legend>
      <SegmentedControl
        size="sm"
        ariaLabel={FAKE_DATA_IN_PRODUCT_COPY.title}
        className="self-start"
        value={value}
        onChange={(next) => onChange(next as FakeDataInProduct)}
        options={FAKE_DATA_IN_PRODUCT_OPTIONS.map(({ value: v, label }) => ({ value: v, label }))}
      />
      <span className="text-[11.5px] text-(--text-secondary)">{fakeDataInProductLine(value)}</span>
    </fieldset>
  )
}
