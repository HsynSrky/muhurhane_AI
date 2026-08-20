import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import type { Motif } from '@/api/types'

interface DetailCardProps {
  motifs: Motif[]
}

/**
 * Seçili motiflerin uzun tarihçeleri (AC-02) ve kısa kaynak künyesi.
 */
export default function DetailCard({ motifs }: DetailCardProps) {
  const reduceMotion = useReducedMotion()

  if (motifs.length === 0) {
    return (
      <div className="panel p-5">
        <p className="text-sm leading-relaxed text-[var(--color-muted)]">
          Bir motif seçtiğinizde tarihçesi ve kaynak künyesi burada açılır.
        </p>
      </div>
    )
  }

  return (
    <div className="panel divide-y divide-[var(--color-line)]">
      <AnimatePresence initial={false}>
        {motifs.map((motif) => (
          <motion.article
            key={motif.id}
            layout={!reduceMotion}
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="p-5"
          >
            <header className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-base">{motif.name}</h3>
              <span className="eyebrow">{motif.period}</span>
            </header>
            <p className="text-[0.86rem] leading-relaxed text-[var(--color-muted)]">
              {motif.history}
            </p>
            {motif.citations.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-[var(--color-line)] pt-3">
                {motif.citations.map((citation) => (
                  <li
                    key={citation}
                    className="text-[0.68rem] leading-snug text-[var(--color-muted)]"
                  >
                    {citation}
                  </li>
                ))}
              </ul>
            )}
          </motion.article>
        ))}
      </AnimatePresence>
    </div>
  )
}
