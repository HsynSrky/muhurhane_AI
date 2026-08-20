/**
 * Renk paletleri (PRD §10).
 *
 * Render tek kaynaktan yapıldığı için (PRD-tamamlayici.md S-2) palet değerleri
 * burada yaşar; arka uç yalnızca stil kimliğini doğrular, renk üretmez.
 *
 * Kural: açık zeminlerde koyu mürekkep, koyu zeminde açık mürekkep.
 * `accent` glow tonudur; ince tik ve ayraç çizgilerinde kullanılır.
 */

import type { StyleId } from '@/api/types'

export interface SealStyle {
  id: StyleId
  name: string
  description: string
  /** Mühür zemini. */
  ground: string
  /** Ana çizgi rengi (motif katmanı 0). */
  ink: string
  /** İkincil çizgi rengi (motif katmanı 1). */
  mid: string
  /** Vurgu rengi (motif katmanı 2, tik çizgileri, ayraçlar). */
  accent: string
  /** Sayfa arayüzünün bu stille uyumlu zemin tonu. */
  surface: string
  dark: boolean
}

export const SEAL_STYLES: readonly SealStyle[] = [
  {
    id: 'acik-turkuaz',
    name: 'Açık Turkuaz',
    description: 'Açık zemin, turkuaz mürekkep',
    ground: '#e8fafb',
    ink: '#0c3c46',
    mid: '#14707d',
    accent: '#009e95',
    surface: '#f2fcfd',
    dark: false,
  },
  {
    id: 'antik-tunc',
    name: 'Antik Tunç',
    description: 'Kazı buluntusu dokusu',
    ground: '#e8e0d2',
    ink: '#463016',
    mid: '#78582a',
    accent: '#a08246',
    surface: '#f4efe6',
    dark: false,
  },
  {
    id: 'gece-lacivert',
    name: 'Gece Lacivert',
    description: 'Çini gecesi',
    ground: '#122434',
    ink: '#d2e6eb',
    mid: '#508c96',
    accent: '#009e95',
    surface: '#0d1b27',
    dark: true,
  },
] as const

export const DEFAULT_STYLE_ID: StyleId = 'acik-turkuaz'

const BY_ID = new Map(SEAL_STYLES.map((style) => [style.id, style]))

export function getStyle(id: StyleId | string | null | undefined): SealStyle {
  return BY_ID.get(id as StyleId) ?? SEAL_STYLES[0]!
}
