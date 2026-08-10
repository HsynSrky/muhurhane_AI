import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { fetchShare } from '@/api/client'
import type { SlotId } from '@/api/types'
import DetailCard from '@/components/DetailCard'
import Logo from '@/components/Logo'
import MotifStrip from '@/components/MotifStrip'
import NameField from '@/components/NameField'
import SealPreview from '@/components/SealPreview'
import StylePicker from '@/components/StylePicker'
import { useSeal } from '@/state/sealStore'
import { track, trackOnce } from '@/state/session'

const SLOT_HINTS: Record<SlotId, string> = {
  frame: 'Dış halkada tekrarlanır',
  symbol: 'Mührün merkezine oturur',
  tribe: 'Alt kartuşa işlenir',
}

export default function Studio() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const reduceMotion = useReducedMotion()

  const {
    catalog,
    loading,
    error,
    selection,
    frame,
    symbol,
    tribe,
    motifCount,
    orkhon,
    previewSvg,
    maxNameLength,
    selectMotif,
    setName,
    setStyleId,
    confirm,
    applySpec,
  } = useSeal()

  useEffect(() => {
    trackOnce('studio_view')
  }, [])

  // Paylaşım linkiyle gelindiyse konfigürasyon geri yüklenir (E-1).
  const shareCode = searchParams.get('m')
  useEffect(() => {
    if (!shareCode) return
    let active = true
    fetchShare(shareCode)
      .then((record) => {
        if (active) applySpec(record.spec)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [shareCode, applySpec])

  const handleToggle = useCallback(
    (slot: SlotId) => (motifId: string) => {
      selectMotif(slot, motifId)
      track('slot_selected', { slot, motifId })
    },
    [selectMotif],
  )

  const handleName = useCallback(
    (value: string) => {
      setName(value)
      track('name_entered', { filled: value.trim().length > 0 })
    },
    [setName],
  )

  const handleStyle = useCallback(
    (styleId: Parameters<typeof setStyleId>[0]) => {
      setStyleId(styleId)
      track('style_selected', { styleId })
    },
    [setStyleId],
  )

  const handleConfirm = useCallback(() => {
    confirm()
    track('confirmed', { motifCount, hasName: selection.latinName.trim().length > 0 })
    navigate('/sertifika')
  }, [confirm, motifCount, navigate, selection.latinName])

  const selectedMotifs = useMemo(
    () => [frame, symbol, tribe].filter((motif) => motif !== null),
    [frame, symbol, tribe],
  )

  const isEmpty = motifCount === 0 && selection.latinName.trim() === ''

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="panel max-w-md p-8 text-center">
          <h1 className="mb-3 text-xl">Katalog yüklenemedi</h1>
          <p className="mb-6 text-sm leading-relaxed text-[var(--color-muted)]">{error}</p>
          <p className="text-xs text-[var(--color-muted)]">
            Arka ucun çalıştığından emin olun; motif kataloğu için{' '}
            <code className="text-[var(--color-turkuaz-soft)]">
              python backend/scripts/normalize_motifs.py
            </code>{' '}
            komutunu çalıştırmanız gerekebilir.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col xl:h-screen xl:overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-[var(--color-line)] px-6 py-4">
        <div className="flex items-center gap-4">
          <Link to="/" aria-label="Ana sayfaya dön">
            <Logo size={38} />
          </Link>
          <div>
            <h1 className="text-lg leading-tight">Atölye</h1>
            <p className="text-xs text-[var(--color-muted)]">
              Üç katman seçin, mührünüz anında kurulsun
            </p>
          </div>
        </div>

        <p className="hidden text-right text-xs leading-tight text-[var(--color-muted)] sm:block">
          TDT 13. Buluşma
          <br />
          <span className="text-[var(--color-turkuaz-soft)]">Türkiye Anısına</span>
        </p>
      </header>

      <main className="grid flex-1 gap-8 px-6 py-6 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_25rem] xl:gap-10">
        {/* Sol sütun: seçim şeritleri ve tarihçe. Uzun metin için bağımsız kayar. */}
        <div className="flex flex-col gap-6 xl:min-h-0 xl:overflow-y-auto xl:pr-3">
          {loading || !catalog ? (
            <div className="space-y-7" aria-hidden="true">
              {[0, 1, 2].map((row) => (
                <div key={row} className="space-y-3">
                  <div className="h-5 w-32 animate-pulse rounded bg-[var(--color-surface)]" />
                  <div className="flex gap-3">
                    {[0, 1, 2, 3, 4].map((card) => (
                      <div
                        key={card}
                        className="h-[10.5rem] w-[8.75rem] shrink-0 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-surface)]"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {catalog.slots.map((group, index) => (
                <MotifStrip
                  key={group.id}
                  group={group}
                  index={index + 1}
                  hint={SLOT_HINTS[group.id]}
                  selectedId={
                    group.id === 'frame'
                      ? selection.frameId
                      : group.id === 'symbol'
                        ? selection.symbolId
                        : selection.tribeId
                  }
                  onToggle={handleToggle(group.id)}
                />
              ))}

              <DetailCard motifs={selectedMotifs} />
            </>
          )}
        </div>

        {/* Sağ sütun: canlı önizleme ve kişiselleştirme.
            Onay düğmesi kaydırma alanının dışında; hiçbir zaman içeriği örtmez. */}
        <aside className="flex flex-col gap-5 xl:min-h-0">
          <div className="flex flex-col gap-5 xl:min-h-0 xl:flex-1 xl:gap-4 xl:overflow-y-auto xl:pr-1">
            <div className="relative mx-auto w-full max-w-[21rem]">
              <SealPreview
                svg={previewSvg}
                label="Mühür simülasyonu"
                emptyHint={
                  isEmpty
                    ? 'Soldan bir kuşak, arma veya damga seçin; mühür burada belirsin.'
                    : null
                }
              />
              <p className="mt-2.5 text-center text-[0.72rem] text-[var(--color-muted)]">
                Filigranlı simülasyon · onaydan sonra kaldırılır
              </p>
            </div>

            <NameField
              value={selection.latinName}
              maxLength={maxNameLength}
              orkhon={orkhon}
              onChange={handleName}
            />

            <StylePicker value={selection.styleId} onChange={handleStyle} />
          </div>

          <motion.div layout={!reduceMotion} className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={motifCount === 0}
              className="btn-primary w-full"
            >
              Onayla ve sertifikayı al
            </button>
            <p className="text-center text-[0.7rem] text-[var(--color-muted)]">
              {motifCount === 0
                ? 'Devam etmek için en az bir motif seçin.'
                : 'HD indirme onaydan sonra açılır.'}
            </p>
          </motion.div>
        </aside>
      </main>
    </div>
  )
}
