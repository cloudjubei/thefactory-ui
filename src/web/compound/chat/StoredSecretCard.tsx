import { SecretInput } from '../SecretInput'
import { useStoredSecretReveal } from '../../../headless/hooks/useStoredSecretReveal'
import { STORED_SECRET_COPY } from '../../../headless/utils/storedSecretViewConstants'
import type { StoredSecretView } from '../../../headless/utils/storedSecretViewTypes'

/**
 * A stored secret an agent showed the person: which one, and a field only they
 * can reveal. The value is fetched on their confirm and never reaches the agent.
 */
export default function StoredSecretCard({ secret }: { secret: StoredSecretView }) {
  const { onReveal, missing } = useStoredSecretReveal(secret)
  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="font-medium text-(--text-primary)">{secret.label}</span>
        <span className="truncate text-(--text-secondary)">{secret.name}</span>
      </div>
      {secret.purpose ? <p className="text-(--text-secondary)">{secret.purpose}</p> : null}
      {missing ? (
        <p role="status" className="text-(--text-secondary)">
          {STORED_SECRET_COPY.missing}
        </p>
      ) : (
        <SecretInput
          value=""
          readOnly
          aria-label={`${secret.label} ${secret.name}`}
          placeholder="••••••••"
          onReveal={onReveal}
          revealConfirmTitle={STORED_SECRET_COPY.confirmTitle}
          revealConfirmDescription={STORED_SECRET_COPY.confirmDescription}
        />
      )}
      <p className="text-[11px] text-(--text-tertiary)">{STORED_SECRET_COPY.only}</p>
    </div>
  )
}
