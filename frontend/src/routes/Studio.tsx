import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import type { SlotId } from '@/api/types'
import DetailCard from '@/components/DetailCard'
import Logo from '@/components/Logo'
import MotifStrip from '@/components/MotifStrip'
import NameField from '@/components/NameField'
import SealPreview from '@/components/SealPreview'
import StylePicker from '@/components/StylePicker'
import { specFromSearchParams } from '@/data/shareLink'
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

  const shareApplied = useRef(false)
  useEffect(() => {
    if (shareApplied.current) return
    const incoming = specFromSearchParams(searchParams)
    if (!incoming) return
    shareApplied.current = true
    applySpec(incoming)
  }, [searchParams, applySpec])

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

  return (
    <div className="flex min-h-dvh flex-col xl:h-dvh xl:overflow-hidden">
      <header className="flex shrink-0 items-center gap-4 border-b border-[var(--color-line)] px-4 py-3 sm:gap-6 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link to="/" aria-label="Ana sayfaya dön">
            <Logo size={36} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg leading-tight">Atölye</h1>
            <p className="text-xs text-[var(--color-muted)]">
              Üç katman seçin, mührünüz anında kurulsun
            </p>
          </div>
        </div>
      </header>

      <main className="grid flex-1 gap-6 px-4 py-4 pb-28 sm:px-6 sm:py-6 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_25rem] xl:gap-10 xl:pb-6">
        <div className="order-2 flex flex-col gap-6 xl:order-1 xl:min-h-0 xl:overflow-y-auto xl:pr-3">
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
        </div>

        <aside className="order-1 flex flex-col gap-5 xl:order-2 xl:min-h-0">
          <div className="flex flex-col gap-5 xl:min-h-0 xl:flex-1 xl:gap-4 xl:overflow-y-auto xl:pr-1">
            <div className="relative mx-auto w-full max-w-[21rem]">
              <SealPreview
                svg={previewSvg}
                label="Mühür simülasyonu"
                emptyHint={
                  isEmpty
                    ? 'Bir kuşak, arma veya damga seçin; mühür burada belirsin.'
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

          <motion.div
            layout={!reduceMotion}
            className="fixed inset-x-0 bottom-0 z-20 flex shrink-0 flex-col gap-2 border-t border-[var(--color-line)] bg-[var(--color-abyss)]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6 xl:static xl:inset-auto xl:border-0 xl:bg-transparent xl:px-0 xl:pt-0 xl:pb-0 xl:backdrop-blur-none"
          >
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
