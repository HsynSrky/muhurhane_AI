import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import type { Motif } from '@/api/types'

interface DetailCardProps {
  motifs: Motif[]
}

/**
 * Seçili motiflerin uzun tarihçeleri (AC-02).
 *
 * Kartta yalnızca kısa blurb duruyor; uzun metin ancak kullanıcı o motifi
 * seçtiğinde açılıyor. Bilgi kademeli veriliyor ki ekran ilk bakışta yormasın.
 */
export default function DetailCard({ motifs }: DetailCardProps) {
  const reduceMotion = useReducedMotion()

  if (motifs.length === 0) {
    return (
      <div className="panel p-5">
        <p className="text-sm leading-relaxed text-[var(--color-muted)]">
          Bir motif seçtiğinizde tarihçesi burada açılır.
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
          </motion.article>
        ))}
      </AnimatePresence>
    </div>
  )
}
