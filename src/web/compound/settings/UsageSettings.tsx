import { useDailyUsage } from '../../../headless/hooks/useDailyUsage'
import UsageSettingsView from './UsageSettingsView'

/** Settings › Usage: the daily usage summaries, read live from the backend. */
export default function UsageSettings() {
  const { view, days, setDays, loading, error, rebuild, rebuilding } = useDailyUsage()
  return (
    <UsageSettingsView
      view={view}
      days={days}
      onDaysChange={setDays}
      loading={loading}
      error={error}
      onRebuild={() => void rebuild()}
      rebuilding={rebuilding}
    />
  )
}
