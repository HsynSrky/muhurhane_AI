/** Ön uç veri sözleşmesi. Katalog derleme zamanında gömülür. */

export type SlotId = 'frame' | 'symbol' | 'tribe'

export type StyleId = 'acik-turkuaz' | 'antik-tunc' | 'gece-lacivert'

/** Normalize edilmiş motif; `body` doğrudan SVG'ye gömülebilir. */
export interface Motif {
  id: string
  slug: string
  slot: SlotId
  name: string
  period: string
  blurb: string
  history: string
  /** Kısa akademik kaynak künyeleri; kartın altında gösterilir. */
  citations: string[]
  /** Yalnızca `frame` motiflerinde dolu: kuşakta kaç kez tekrarlanacağı. */
  repeat: number | null
  /** [x, y, genişlik, yükseklik] — 400x400 kaynak uzayında. */
  bbox: [number, number, number, number]
  body: string
}

export interface SlotGroup {
  id: SlotId
  label: string
  motifs: Motif[]
}

export interface Catalog {
  generatedAt: string
  period: string
  viewBox: [number, number, number, number]
  slots: SlotGroup[]
  styles: StyleId[]
  maxNameLength: number
}

export interface OrkhonMap {
  direction: string
  wordSeparator: string
  vowelClasses: { back: string[]; front: string[]; rounded: string[] }
  vowels: Record<string, string>
  dual: Record<string, { back: string; front: string }>
  single: Record<string, string>
  quad: Record<string, Record<string, string>>
  digraphs: Record<string, string>
  aliases: Record<string, string>
  approximations: Record<string, string>
}

export interface SealSpecPayload {
  frameId: string | null
  symbolId: string | null
  tribeId: string | null
  latinName: string
  styleId: StyleId
}
