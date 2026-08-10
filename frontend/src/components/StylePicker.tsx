import type { StyleId } from '@/api/types'
import { SEAL_STYLES, getStyle } from '@/seal/styles'

interface StylePickerProps {
  value: StyleId
  onChange: (value: StyleId) => void
}

/**
 * Renk stili seçici.
 *
 * Paletler kendilerini anlatıyor, bu yüzden ad her kartın altında değil tek bir
 * yerde gösteriliyor: kontrol yatayda kalıyor ve stüdyoda kaydırma gerekmiyor.
 */
export default function StylePicker({ value, onChange }: StylePickerProps) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <legend className="text-lg font-[family-name:var(--font-display)]">Mürekkep</legend>
        <span className="text-xs text-[var(--color-muted)]">{getStyle(value).name}</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {SEAL_STYLES.map((style) => {
          const active = style.id === value
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onChange(style.id)}
              aria-pressed={active}
              aria-label={style.name}
              title={`${style.name} · ${style.description}`}
              className={`flex items-center justify-center rounded-[var(--radius-card)] border py-2.5 transition-all duration-200 ${
                active
                  ? 'border-[var(--color-turkuaz)] bg-[var(--color-surface-raised)]'
                  : 'border-[var(--color-line)] bg-[var(--color-surface)]/50 hover:border-[var(--color-turkuaz)]/60'
              }`}
            >
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full ring-1 ring-black/25"
                style={{ background: style.ground }}
              >
                <span
                  className="size-3.5 rounded-full"
                  style={{ background: style.ink, boxShadow: `0 0 0 1.5px ${style.accent}` }}
                />
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
