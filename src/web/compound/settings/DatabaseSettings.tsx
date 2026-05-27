import DataLocationSettingsPanel from './DataLocationSettingsPanel'
import DbHealthPanel from './DbHealthPanel'
import IngestionPanel from './IngestionPanel'

export default function DatabaseSettings() {
  return (
    <div className="flex flex-col gap-8">
      <DbHealthPanel />
      <IngestionPanel />
      <DataLocationSettingsPanel />
    </div>
  )
}
