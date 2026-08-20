import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import Logo from '@/components/Logo'
import SealPreview from '@/components/SealPreview'
import { buildCertificateText } from '@/data/certificate'
import { buildShareUrl } from '@/data/shareLink'
import { buildFileName, renderSealPng, triggerDownload } from '@/seal/raster'
import { useSeal } from '@/state/sealStore'
import { track, trackOnce } from '@/state/session'

export default function Certificate() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { catalog, selection, composition, finalSvg, spec, motifCount, frame, symbol, tribe } =
    useSeal()

  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  const confirmed = selection.confirmed && motifCount > 0

  const motifNames = useMemo(
    () =>
      [frame, symbol, tribe]
        .filter((motif) => motif !== null)
        .map((motif) => motif.name),
    [frame, symbol, tribe],
  )

  const certificate = useMemo(
    () => buildCertificateText(selection.latinName, motifNames, catalog.period),
    [catalog.period, motifNames, selection.latinName],
  )

  useEffect(() => {
    if (confirmed) trackOnce('certificate_view')
  }, [confirmed])

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    setDownloadError(null)
    try {
      const blob = await renderSealPng({ ...composition, watermark: false })
      triggerDownload(blob, buildFileName(selection.latinName))
      track('download', { motifCount, styleId: selection.styleId })
    } catch (cause) {
      setDownloadError(
        cause instanceof Error ? cause.message : 'Mühür indirilemedi, tekrar deneyin.',
      )
    } finally {
      setDownloading(false)
    }
  }, [composition, motifCount, selection.latinName, selection.styleId])

  const handleShare = useCallback(async () => {
    try {
      const url = buildShareUrl(window.location.origin, spec, import.meta.env.BASE_URL)
      setShareUrl(url)
      await navigator.clipboard?.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2600)
    } catch {
      setDownloadError('Paylaşım linki kopyalanamadı.')
    }
  }, [spec])

  if (!confirmed) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel max-w-md p-8 text-center"
        >
          <p className="eyebrow mb-3">Sertifika hazır değil</p>
          <h1 className="mb-3 text-2xl">Önce mührünüzü onaylayın</h1>
          <p className="mb-7 text-sm leading-relaxed text-[var(--color-muted)]">
            Resmî çıktı yalnızca atölyede oluşturulan ve onaylanan mühürler için
            üretilir. Atölyeye dönüp seçimlerinizi tamamlayın.
          </p>
          <button type="button" onClick={() => navigate('/atolye')} className="btn-primary">
            Atölyeye dön
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3 sm:gap-6 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link to="/" aria-label="Ana sayfaya dön">
            <Logo size={36} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg leading-tight">Sertifika</h1>
            <p className="text-xs text-[var(--color-muted)]">Filigransız resmî çıktı</p>
          </div>
        </div>
        <Link to="/atolye" className="btn-ghost shrink-0 px-3 py-2 text-sm sm:px-6 sm:py-3">
          ← Düzenle
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-[30rem]"
        >
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,var(--color-turkuaz)_0%,transparent_65%)] opacity-20 blur-2xl" />
          <SealPreview svg={finalSvg} label="Onaylanmış mühür" />
        </motion.div>

        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
        >
          <p className="eyebrow mb-4">Anı Belgesi</p>

          <blockquote className="border-l-2 border-[var(--color-turkuaz)] pl-5">
            <p className="font-[family-name:var(--font-display)] text-[1.25rem] leading-snug text-[var(--color-parchment)] sm:text-[1.6rem]">
              {certificate.body}
            </p>
            {certificate.footer ? (
              <footer className="mt-4 text-sm text-[var(--color-turkuaz-soft)]">
                {certificate.footer}
              </footer>
            ) : null}
          </blockquote>

          <dl className="mt-8 grid gap-4 border-t border-[var(--color-line)] pt-6 sm:grid-cols-2">
            <div>
              <dt className="eyebrow mb-1.5">Motifler</dt>
              <dd className="text-sm leading-relaxed text-[var(--color-muted)]">
                {motifNames.join(' · ')}
              </dd>
            </div>
            <div>
              <dt className="eyebrow mb-1.5">Çözünürlük</dt>
              <dd className="text-sm text-[var(--color-muted)]">3000 × 3000 px · PNG</dd>
            </div>
          </dl>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="btn-primary w-full sm:w-auto"
            >
              {downloading ? 'Hazırlanıyor…' : 'HD mührü indir'}
            </button>

            <button type="button" onClick={handleShare} className="btn-ghost w-full sm:w-auto">
              {shareCopied ? 'Link kopyalandı ✓' : 'Paylaşım linki oluştur'}
            </button>
          </div>

          {shareUrl && (
            <p className="mt-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-abyss)]/50 px-4 py-2.5 font-mono text-[0.72rem] break-all text-[var(--color-muted)]">
              {shareUrl}
            </p>
          )}

          {downloadError && (
            <p role="alert" className="mt-4 text-sm text-[#ff9f9f]">
              {downloadError}
            </p>
          )}
        </motion.section>
      </main>
    </div>
  )
}
