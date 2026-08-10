import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { createShare, fetchCertificateText } from '@/api/client'
import type { CertificateText } from '@/api/types'
import Logo from '@/components/Logo'
import SealPreview from '@/components/SealPreview'
import { buildFileName, renderSealPng, triggerDownload } from '@/seal/raster'
import { useSeal } from '@/state/sealStore'
import { track, trackOnce } from '@/state/session'

export default function Certificate() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { selection, composition, finalSvg, spec, motifCount, frame, symbol, tribe } = useSeal()

  const [certificate, setCertificate] = useState<CertificateText | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  const confirmed = selection.confirmed && motifCount > 0

  useEffect(() => {
    if (confirmed) trackOnce('certificate_view')
  }, [confirmed])

  useEffect(() => {
    if (!confirmed) return
    let active = true
    fetchCertificateText(spec)
      .then((text) => {
        if (active) setCertificate(text)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [confirmed, spec])

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
      const record = await createShare(spec)
      const url = `${window.location.origin}/atolye?m=${record.code}`
      setShareUrl(url)
      await navigator.clipboard?.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2600)
    } catch {
      setDownloadError('Paylaşım linki oluşturulamadı.')
    }
  }, [spec])

  // AC-05: onaylanmamış mühür için resmî çıktı sunulmaz.
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

  const motifNames = [frame, symbol, tribe]
    .filter((motif) => motif !== null)
    .map((motif) => motif.name)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-6 border-b border-[var(--color-line)] px-6 py-4">
        <div className="flex items-center gap-4">
          <Link to="/" aria-label="Ana sayfaya dön">
            <Logo size={38} />
          </Link>
          <div>
            <h1 className="text-lg leading-tight">Sertifika</h1>
            <p className="text-xs text-[var(--color-muted)]">Filigransız resmî çıktı</p>
          </div>
        </div>
        <Link to="/atolye" className="btn-ghost">
          ← Düzenle
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-10 lg:grid-cols-[0.95fr_1.05fr]">
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
            <p className="font-[family-name:var(--font-display)] text-[1.6rem] leading-snug text-[var(--color-parchment)]">
              {certificate?.body ?? 'Anı metniniz hazırlanıyor…'}
            </p>
            <footer className="mt-4 text-sm text-[var(--color-turkuaz-soft)]">
              {certificate?.footer ?? 'TDT 13. Buluşma · Türkiye Anısına'}
            </footer>
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

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="btn-primary"
            >
              {downloading ? 'Hazırlanıyor…' : 'HD mührü indir'}
            </button>

            <button type="button" onClick={handleShare} className="btn-ghost">
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
