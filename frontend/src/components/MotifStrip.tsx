import type { SlotGroup } from '@/api/types'
import MotifCard from './MotifCard'

interface MotifStripProps {
  group: SlotGroup
  index: number
  selectedId: string | null
  hint: string
  onToggle: (motifId: string) => void
}

export default function MotifStrip({
  group,
  index,
  selectedId,
  hint,
  onToggle,
}: MotifStripProps) {
  const headingId = `slot-${group.id}-heading`

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <header className="flex items-baseline gap-2 sm:gap-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[var(--color-line)] text-[0.7rem] font-semibold text-[var(--color-turkuaz-soft)]">
          {index}
        </span>
        <h2 id={headingId} className="text-lg">
          {group.label}
        </h2>
        <p className="min-w-0 text-xs text-[var(--color-muted)]">{hint}</p>
      </header>

      <div className="scroll-x -mx-1 flex gap-3 px-1 pb-2">
        {group.motifs.map((motif) => (
          <MotifCard
            key={motif.id}
            motif={motif}
            selected={selectedId === motif.id}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  )
}
