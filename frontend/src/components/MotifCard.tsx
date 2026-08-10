import { useMemo } from 'react'

import type { Motif } from '@/api/types'
import { motifThumbSvg } from '@/seal/thumb'

interface MotifCardProps {
  motif: Motif
  selected: boolean
  onToggle: (motifId: string) => void
}

const SELECTED_COLOURS = { ink: '#062229', mid: '#0d4653', accent: '#00707a' }
const IDLE_COLOURS = { ink: '#cfe6ea', mid: '#7fa8b1', accent: '#52d4e6' }

export default function MotifCard({ motif, selected, onToggle }: MotifCardProps) {
  const thumb = useMemo(
    () => motifThumbSvg(motif, selected ? SELECTED_COLOURS : IDLE_COLOURS),
    [motif, selected],
  )

  return (
    <button
      type="button"
      onClick={() => onToggle(motif.id)}
      aria-pressed={selected}
      title={motif.blurb}
      className={`group relative flex w-[8.75rem] shrink-0 flex-col gap-1.5 rounded-[var(--radius-card)] border p-2.5 text-left transition-all duration-200 ${
        selected
          ? 'border-[var(--color-turkuaz)] bg-[var(--color-turkuaz-soft)] shadow-[0_14px_34px_-16px_var(--color-turkuaz)]'
          : 'border-[var(--color-line)] bg-[var(--color-surface)]/60 hover:-translate-y-0.5 hover:border-[var(--color-turkuaz)]/60 hover:bg-[var(--color-surface-raised)]/70'
      }`}
    >
      <span
        className="mx-auto block aspect-square w-24 [&>svg]:size-full"
        dangerouslySetInnerHTML={{ __html: thumb }}
      />

      <span className="flex flex-col gap-0.5">
        <span
          className={`font-[family-name:var(--font-display)] text-[0.94rem] leading-tight font-semibold ${
            selected ? 'text-[#062229]' : 'text-[var(--color-parchment)]'
          }`}
        >
          {motif.name}
        </span>
        <span
          className={`line-clamp-2 text-[0.7rem] leading-snug ${
            selected ? 'text-[#0d4653]' : 'text-[var(--color-muted)]'
          }`}
        >
          {motif.blurb}
        </span>
      </span>

      {selected && (
        <span
          aria-hidden="true"
          className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-[#062229] text-[0.65rem] text-[var(--color-turkuaz-soft)]"
        >
          ✓
        </span>
      )}
    </button>
  )
}
