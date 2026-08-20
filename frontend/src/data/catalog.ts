/**
 * Motif kataloğu ve Orhun tablosu — derleme zamanında gömülür.
 *
 * Canlı ortamda arka uç yoktur; `normalize_motifs.py` çıktısı Vite ile
 * pakete girer. Dosya değişince geliştirme sunucusu HMR ile tazelenir (T10).
 */

import generated from '../../../backend/data/motifs.generated.json'
import orkhonTable from '../../../backend/data/orkhon_map.json'

import type { Catalog, Motif, OrkhonMap, SlotId, StyleId } from '@/api/types'

const SLOT_ORDER: SlotId[] = ['frame', 'symbol', 'tribe']

const SLOT_LABELS: Record<SlotId, string> = {
  frame: 'Dış Kuşak',
  symbol: 'Merkez Arma',
  tribe: 'Boy Damgası',
}

const STYLES: StyleId[] = ['acik-turkuaz', 'antik-tunc', 'gece-lacivert']

export const MAX_NAME_LENGTH = 24

interface GeneratedMotif {
  id: string
  slug: string
  slot: SlotId
  name: string
  period: string
  blurb: string
  history: string
  citations?: string[]
  repeat?: number | null
  bbox: number[]
  body: string
}

interface GeneratedFile {
  generatedAt: string
  period: string
  viewBox: number[]
  motifs: GeneratedMotif[]
}

function toMotif(entry: GeneratedMotif): Motif {
  const [x, y, w, h] = entry.bbox
  return {
    id: entry.id,
    slug: entry.slug,
    slot: entry.slot,
    name: entry.name,
    period: entry.period,
    blurb: entry.blurb,
    history: entry.history,
    citations: entry.citations ?? [],
    repeat: entry.repeat ?? null,
    bbox: [x ?? 0, y ?? 0, w ?? 0, h ?? 0],
    body: entry.body,
  }
}

export function loadCatalog(): Catalog {
  const source = generated as GeneratedFile
  const motifs = source.motifs.map(toMotif)
  const [vx, vy, vw, vh] = source.viewBox

  return {
    generatedAt: source.generatedAt,
    period: source.period,
    viewBox: [vx ?? 0, vy ?? 0, vw ?? 400, vh ?? 400],
    slots: SLOT_ORDER.map((id) => ({
      id,
      label: SLOT_LABELS[id],
      motifs: motifs.filter((motif) => motif.slot === id),
    })),
    styles: STYLES,
    maxNameLength: MAX_NAME_LENGTH,
  }
}

export const orkhonMap = orkhonTable as OrkhonMap
