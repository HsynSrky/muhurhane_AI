import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

import Logo from '@/components/Logo'
import SealPreview from '@/components/SealPreview'
import { composeSeal } from '@/seal/compose'
import { getStyle } from '@/seal/styles'
import { useSeal } from '@/state/sealStore'
import { trackOnce } from '@/state/session'

/** Vitrin mührü: ürünün ne ürettiğini tek bakışta gösterir. */
const SHOWCASE = { frameId: '3.1', symbolId: '1.1', tribeId: '2.1', name: 'Türkiye' }

const HIGHLIGHTS = [
  {
    title: 'Bilinçli seçim',
    body: 'Her motifin dönemi ve hikâyesi yanında. Ne seçtiğinizi bilerek seçersiniz.',
  },
  {
    title: 'Anlık önizleme',
    body: 'Kuşak, arma ve damga seçtikçe mühür gecikmesiz olarak önünüzde kurulur.',
  },
  {
    title: 'Size özel çıktı',
    body: 'Adınız Orhun alfabesine çevrilir, onayınızla HD çözünürlükte iner.',
  },
]

export default function Landing() {
  const { catalog, loading, error } = useSeal()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    trackOnce('landing_view')
  }, [])

  const showcaseSvg = useMemo(() => {
    if (!catalog) return null
    const all = catalog.slots.flatMap((slot) => slot.motifs)
    const find = (id: string) => all.find((motif) => motif.id === id) ?? null

    return composeSeal({
      frame: find(SHOWCASE.frameId),
      symbol: find(SHOWCASE.symbolId),
      tribe: find(SHOWCASE.tribeId),
      latinName: SHOWCASE.name,
      // Vitrin mührü sabit; çeviriyazı yerine hazır Orhun dizgesi yeterli.
      orkhonText: '𐰇𐰚𐰼𐰇𐱅',
      style: getStyle('tdt-turkuaz'),
      watermark: false,
      idSuffix: 'showcase',
    })
  }, [catalog])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Logo withWordmark />
        <p className="text-right text-xs leading-tight text-[var(--color-muted)]">
          TDT 13. Buluşma
          <br />
          <span className="text-[var(--color-turkuaz-soft)]">Türkiye Anısına</span>
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-10">
        <div className="grid w-full items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow mb-5">Anadolu Selçuklu Damga Atölyesi</p>

            <h1 className="text-[clamp(2.9rem,7vw,4.6rem)] leading-[0.98]">
              Mühürhane <span className="text-[var(--color-turkuaz-soft)]">AI</span>
            </h1>

            <p className="mt-6 max-w-lg text-[1.06rem] leading-relaxed text-[var(--color-muted)]">
              Üç katman seçin — dış kuşak, merkez arma ve boy damgası. Adınızı yazın,
              Orhun alfabesine çevrilsin. Anadolu Selçuklu motiflerinden kurulmuş,
              yalnızca size ait dijital mührünüzü dakikalar içinde alın.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link to="/atolye" className="btn-primary">
                Atölyeye Gir
                <span aria-hidden="true">→</span>
              </Link>
              <span className="text-xs text-[var(--color-muted)]">
                Kayıt gerekmez · yaklaşık 3 dakika
              </span>
            </div>

            <dl className="mt-12 grid gap-6 sm:grid-cols-3">
              {HIGHLIGHTS.map((item) => (
                <div key={item.title}>
                  <dt className="mb-1.5 text-sm font-semibold text-[var(--color-parchment)]">
                    {item.title}
                  </dt>
                  <dd className="text-[0.8rem] leading-relaxed text-[var(--color-muted)]">
                    {item.body}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.section>

          <motion.section
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto w-full max-w-[30rem]"
            aria-hidden={showcaseSvg ? undefined : true}
          >
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,var(--color-turkuaz)_0%,transparent_65%)] opacity-20 blur-2xl" />

            {showcaseSvg ? (
              <SealPreview svg={showcaseSvg} label="Örnek mühür: Türkiye" />
            ) : (
              <div className="grid aspect-square w-full place-items-center rounded-full border border-dashed border-[var(--color-line)]">
                <p className="text-sm text-[var(--color-muted)]">
                  {error ? 'Katalog yüklenemedi' : loading ? 'Motifler yükleniyor…' : ''}
                </p>
              </div>
            )}
          </motion.section>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-8">
        <p className="border-t border-[var(--color-line)] pt-5 text-[0.72rem] leading-relaxed text-[var(--color-muted)]">
          Mühürhane AI kurallı bir kompozisyon motorudur; üretken (generative) bir
          yapay zekâ modeli kullanmaz. “AI” yalnızca ürün adının parçasıdır.
        </p>
      </footer>
    </div>
  )
}
