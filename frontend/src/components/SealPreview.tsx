import { motion, useReducedMotion } from 'framer-motion'

interface SealPreviewProps {
  svg: string
  label: string
  /** Boş durumda mühür yerine gösterilecek yönlendirme (T9). */
  emptyHint?: string | null
  className?: string
}

/**
 * Mührü ekrana basar.
 *
 * SVG dizgesi `composeSeal` tarafından üretilir; kullanıcı metni orada XML
 * kaçışından geçtiği için doğrudan gömmek güvenli. React ağacı yerine tek bir
 * dizge yazmak, her seçim değişiminde binlerce düğümü diff'lemekten çok daha
 * hızlı — önizleme tek karede güncelleniyor.
 */
export default function SealPreview({
  svg,
  label,
  emptyHint = null,
  className = '',
}: SealPreviewProps) {
  const reduceMotion = useReducedMotion()

  return (
    <div className={`relative aspect-square w-full ${className}`}>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="size-full drop-shadow-[0_28px_60px_rgba(0,0,0,0.55)]"
      >
        <div
          role="img"
          aria-label={label}
          className="size-full [&>svg]:size-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </motion.div>

      {emptyHint && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-10">
          <p className="max-w-[15rem] rounded-2xl bg-[var(--color-abyss)]/85 px-5 py-4 text-center text-sm leading-relaxed text-[var(--color-parchment)] ring-1 ring-[var(--color-line)] backdrop-blur-sm">
            {emptyHint}
          </p>
        </div>
      )}
    </div>
  )
}
