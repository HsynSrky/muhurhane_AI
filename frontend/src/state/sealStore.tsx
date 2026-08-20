/**
 * Uygulama durumu: katalog, seçimler ve türetilmiş mühür kompozisyonu.
 *
 * Katalog derleme zamanında gömülüdür; ağ yok. Seçimler `sessionStorage`'a
 * yazılır; sayfa yenilense de kaybolmaz (T8). `confirmed` bayrağı yalnızca
 * kullanıcı "Onayla" dediğinde kalkar ve sertifika sayfasının kapısıdır (AC-05).
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { Catalog, Motif, SealSpecPayload, SlotId, StyleId } from '@/api/types'
import { loadCatalog, orkhonMap } from '@/data/catalog'
import { composeSeal, type SealComposition } from '@/seal/compose'
import { EMPTY_RESULT, OrkhonAlphabet, type OrkhonResult } from '@/seal/orkhon'
import { DEFAULT_STYLE_ID, getStyle, type SealStyle } from '@/seal/styles'

const STORAGE_KEY = 'muhurhane.selection'
const catalog: Catalog = loadCatalog()
const alphabet = new OrkhonAlphabet(orkhonMap)

export interface Selection {
  frameId: string | null
  symbolId: string | null
  tribeId: string | null
  latinName: string
  styleId: StyleId
  confirmed: boolean
}

const EMPTY_SELECTION: Selection = {
  frameId: null,
  symbolId: null,
  tribeId: null,
  latinName: '',
  styleId: DEFAULT_STYLE_ID,
  confirmed: false,
}

function readSelection(): Selection {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_SELECTION
    return { ...EMPTY_SELECTION, ...(JSON.parse(raw) as Partial<Selection>) }
  } catch {
    return EMPTY_SELECTION
  }
}

function writeSelection(selection: Selection): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
  } catch {
    // Depolama kapalıysa durum yalnızca bellekte yaşar; akış bozulmaz.
  }
}

interface SealContextValue {
  catalog: Catalog
  selection: Selection
  style: SealStyle
  frame: Motif | null
  symbol: Motif | null
  tribe: Motif | null
  motifCount: number
  orkhon: OrkhonResult
  composition: SealComposition
  previewSvg: string
  finalSvg: string
  spec: SealSpecPayload
  maxNameLength: number
  selectMotif: (slot: SlotId, motifId: string | null) => void
  setName: (value: string) => void
  setStyleId: (value: StyleId) => void
  confirm: () => void
  reset: () => void
  applySpec: (spec: SealSpecPayload) => void
}

const SealContext = createContext<SealContextValue | null>(null)

const SLOT_FIELD: Record<SlotId, 'frameId' | 'symbolId' | 'tribeId'> = {
  frame: 'frameId',
  symbol: 'symbolId',
  tribe: 'tribeId',
}

export function SealProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>(readSelection)

  const update = useCallback((patch: Partial<Selection>) => {
    setSelection((current) => {
      const next = { ...current, ...patch }
      writeSelection(next)
      return next
    })
  }, [])

  const motifsById = useMemo(() => {
    const map = new Map<string, Motif>()
    for (const slot of catalog.slots) {
      for (const motif of slot.motifs) map.set(motif.id, motif)
    }
    return map
  }, [])

  const frame = selection.frameId ? (motifsById.get(selection.frameId) ?? null) : null
  const symbol = selection.symbolId ? (motifsById.get(selection.symbolId) ?? null) : null
  const tribe = selection.tribeId ? (motifsById.get(selection.tribeId) ?? null) : null

  const style = getStyle(selection.styleId)

  const orkhon = useMemo(() => {
    if (!selection.latinName.trim()) return EMPTY_RESULT
    return alphabet.transliterate(selection.latinName)
  }, [selection.latinName])

  const composition = useMemo<SealComposition>(
    () => ({
      frame,
      symbol,
      tribe,
      latinName: selection.latinName,
      orkhonText: orkhon.text,
      style,
      watermark: true,
    }),
    [frame, symbol, tribe, selection.latinName, orkhon.text, style],
  )

  const previewSvg = useMemo(
    () => composeSeal({ ...composition, watermark: true, idSuffix: 'preview' }),
    [composition],
  )

  const finalSvg = useMemo(
    () => composeSeal({ ...composition, watermark: false, idSuffix: 'final' }),
    [composition],
  )

  const spec = useMemo<SealSpecPayload>(
    () => ({
      frameId: selection.frameId,
      symbolId: selection.symbolId,
      tribeId: selection.tribeId,
      latinName: selection.latinName.trim(),
      styleId: selection.styleId,
    }),
    [selection],
  )

  const value = useMemo<SealContextValue>(
    () => ({
      catalog,
      selection,
      style,
      frame,
      symbol,
      tribe,
      motifCount: [frame, symbol, tribe].filter(Boolean).length,
      orkhon,
      composition,
      previewSvg,
      finalSvg,
      spec,
      maxNameLength: catalog.maxNameLength,
      selectMotif: (slot, motifId) => {
        const field = SLOT_FIELD[slot]
        update({ [field]: selection[field] === motifId ? null : motifId, confirmed: false })
      },
      setName: (latinName) => update({ latinName, confirmed: false }),
      setStyleId: (styleId) => update({ styleId, confirmed: false }),
      confirm: () => update({ confirmed: true }),
      reset: () => {
        writeSelection(EMPTY_SELECTION)
        setSelection(EMPTY_SELECTION)
      },
      applySpec: (incoming) =>
        update({
          frameId: incoming.frameId,
          symbolId: incoming.symbolId,
          tribeId: incoming.tribeId,
          latinName: incoming.latinName,
          styleId: incoming.styleId,
          confirmed: false,
        }),
    }),
    [
      selection,
      style,
      frame,
      symbol,
      tribe,
      orkhon,
      composition,
      previewSvg,
      finalSvg,
      spec,
      update,
    ],
  )

  return <SealContext.Provider value={value}>{children}</SealContext.Provider>
}

export function useSeal(): SealContextValue {
  const context = useContext(SealContext)
  if (!context) throw new Error('useSeal yalnızca SealProvider içinde kullanılabilir.')
  return context
}
