import { useEffect, useId, useState } from 'react'

import type { OrkhonResult } from '@/seal/orkhon'

interface NameFieldProps {
  value: string
  maxLength: number
  orkhon: OrkhonResult
  onChange: (value: string) => void
}

const DEBOUNCE_MS = 120

/**
 * İsim girişi.
 *
 * Yazılan değer anında yereldeki alana yansır, mühre 120 ms sonra işlenir:
 * tuş vuruşu hiçbir zaman render'ı beklemez, mühür de her harfte titremez.
 */
export default function NameField({ value, maxLength, orkhon, onChange }: NameFieldProps) {
  const inputId = useId()
  const [draft, setDraft] = useState(value)

  // Paylaşım linki gibi dışarıdan gelen değişiklikler alana yansımalı.
  useEffect(() => setDraft(value), [value])

  useEffect(() => {
    if (draft === value) return
    const timer = setTimeout(() => onChange(draft), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, value, onChange])

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-lg font-[family-name:var(--font-display)]">
          Adınız
        </label>
        <span className="text-xs text-[var(--color-muted)] tabular-nums">
          {draft.length}/{maxLength}
        </span>
      </div>

      <input
        id={inputId}
        type="text"
        value={draft}
        maxLength={maxLength}
        autoComplete="name"
        spellCheck={false}
        placeholder="Örn. Eren Bey"
        onChange={(event) => setDraft(event.target.value)}
        className="w-full rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-abyss)]/60 px-4 py-3 text-[1.05rem] text-[var(--color-parchment)] transition-colors placeholder:text-[var(--color-muted)]/60 hover:border-[var(--color-turkuaz)]/50 focus:border-[var(--color-turkuaz)] focus:outline-none"
      />

      {orkhon.text && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)]/70 bg-[var(--color-abyss)]/40 px-4 py-2.5">
          <p className="eyebrow mb-1">Orhun yazımı</p>
          <p className="orkhon text-xl leading-relaxed text-[var(--color-turkuaz-soft)]">
            {orkhon.text}
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2" dir="ltr">
            {orkhon.words.map((word, wordIndex) => (
              <div key={`${word.latin}-${wordIndex}`} className="flex gap-1.5">
                {word.letters.map((letter, letterIndex) => (
                  <span
                    key={`${letter.latin}-${letterIndex}`}
                    className="flex min-w-[1.15rem] flex-col items-center"
                  >
                    <span className="font-[family-name:var(--font-orkhon)] text-lg leading-none text-[var(--color-turkuaz-soft)]">
                      {letter.orkhon}
                    </span>
                    <span className="mt-1 text-[0.65rem] leading-none text-[var(--color-muted)]">
                      {letter.latin}
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.7rem] leading-snug text-[var(--color-muted)]">
            Çeviriyazı: kalın/ince ünsüz hecenin kendi ünlüsüne göredir. a ile e, ı ile i aynı
            işarettir.
          </p>
          {orkhon.notes.length > 0 && (
            <ul className="mt-2 space-y-1">
              {orkhon.notes.map((note) => (
                <li key={note} className="text-[0.7rem] leading-snug text-[var(--color-muted)]">
                  {note}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
