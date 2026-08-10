/**
 * Mühür kompozisyonu: seçimlerden tam bir SVG belgesi üretir.
 *
 * Bu modül uygulamadaki **tek** render kaynağıdır (PRD-tamamlayici.md S-2).
 * Ekrandaki canlı önizleme de, indirilen 3000x3000 PNG de aynı fonksiyonun
 * çıktısından doğar; ikisinin birbirinden ayrışması yapısal olarak mümkün değil.
 *
 * Saf fonksiyon: DOM'a, React'e ve ağa bağımlı değildir.
 */

import type { Motif } from '@/api/types'
import * as G from './geometry'
import type { SealStyle } from './styles'

export const LATIN_FONT_STACK = "'Cormorant Garamond', 'Iowan Old Style', Georgia, serif"
export const ORKHON_FONT_STACK = "'Noto Sans Old Turkic', 'Segoe UI Historic', sans-serif"

export interface SealComposition {
  frame: Motif | null
  symbol: Motif | null
  tribe: Motif | null
  /** Latin isim; üst yaya işlenir. */
  latinName: string
  /** Orhun çeviriyazısı; alt yaya işlenir. */
  orkhonText: string
  style: SealStyle
  /** Onaydan önceki simülasyonda filigran bindirilir (AC-05). */
  watermark: boolean
  /** Aynı sayfada birden fazla mühür varsa `id` çakışmasını önler. */
  idSuffix?: string
  /** `@font-face` gömme bloğu; yalnızca PNG dışa aktarımında dolu gelir. */
  fontFaceCss?: string
}

const WATERMARK_LABEL = 'SİMÜLASYON'
const STROKE_WIDTH_PATTERN = /stroke-width="([\d.]+)"/g

/**
 * Motif gövdesindeki çizgi kalınlıklarını ölçekler.
 *
 * Kuşak öğeleri 72 px'e küçüldüğünde ham kalınlıklar 1 px'in altına inip
 * kayboluyor; oranları koruyarak hepsini birlikte yükseltmek gerekiyor.
 */
function boostStrokes(body: string, factor: number): string {
  if (factor === 1) return body
  return body.replace(
    STROKE_WIDTH_PATTERN,
    (_match, width: string) => `stroke-width="${(Number(width) * factor).toFixed(2)}"`,
  )
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function ring(radius: number, colour: string, width: number, opacity = 1): string {
  const alpha = opacity === 1 ? '' : ` stroke-opacity="${opacity}"`
  return (
    `<circle cx="${G.CX}" cy="${G.CY}" r="${radius}" fill="none" ` +
    `stroke="${colour}" stroke-width="${width}"${alpha}/>`
  )
}

function diamond(x: number, y: number, size: number, colour: string): string {
  const d = `M${G.round(x)} ${G.round(y - size)}L${G.round(x + size)} ${G.round(y)}L${G.round(x)} ${G.round(y + size)}L${G.round(x - size)} ${G.round(y)}Z`
  return `<path d="${d}" fill="${colour}"/>`
}

/** Dış kenar, kuşak sınırları ve iç alan çizgileri. */
function renderRings(style: SealStyle): string {
  return [
    `<circle cx="${G.CX}" cy="${G.CY}" r="493" fill="${style.ground}"/>`,
    `<circle cx="${G.CX}" cy="${G.CY}" r="${G.INNER_RADIUS}" fill="${style.accent}" fill-opacity="0.05"/>`,
    ring(G.EDGE_HAIRLINE_RADIUS, style.mid, 3),
    ring(G.OUTER_RADIUS, style.ink, 11),
    ring(G.BAND_OUTER_RADIUS, style.mid, 2.5),
    ring(G.BAND_INNER_RADIUS, style.mid, 2.5),
    ring(G.BAND_RULE_RADIUS, style.ink, 5),
    ring(G.INNER_RADIUS, style.mid, 3),
  ].join('')
}

/**
 * Kuşak: frame motifi halka boyunca radyal olarak tekrarlanır.
 *
 * Ham `3.x` dosyaları halka deseni değil bağımsız amblem (PRD-tamamlayici.md
 * A-5); kuşak buradaki tekrarla kuruluyor. Öğeler arasındaki boşluklara ince
 * vurgu baklavaları giriyor ki bant sürekli okunsun.
 */
function renderBand(frame: Motif | null, style: SealStyle): string {
  if (!frame) return ''

  const count = frame.repeat ?? 16
  const body = boostStrokes(frame.body, G.STROKE_BOOST.frame)
  const fit = G.fitTransform(
    frame.bbox,
    G.CX,
    G.CY - G.BAND_RADIUS,
    G.BAND_ELEMENT_RADIUS,
  )

  const elements = G.bandSlots(count)
    .map(({ transform }) => `<g transform="${transform}"><g transform="${fit}">${body}</g></g>`)
    .join('')

  const glints = G.bandGapAngles(count)
    .map((angle) => {
      const point = G.polar(G.BAND_RADIUS, angle - 90)
      return diamond(point.x, point.y, 5, style.accent)
    })
    .join('')

  return `<g class="mh-band">${elements}${glints}</g>`
}

function renderSymbol(symbol: Motif | null): string {
  if (!symbol) return ''
  const body = boostStrokes(symbol.body, G.STROKE_BOOST.symbol)
  const fit = G.fitTransform(symbol.bbox, G.SYMBOL_CX, G.SYMBOL_CY, G.SYMBOL_RADIUS)
  return `<g class="mh-symbol" transform="${fit}">${body}</g>`
}

/** Alt kartuş: mercek biçimli çerçeve içinde boy damgası. */
function renderTribe(tribe: Motif | null, style: SealStyle): string {
  if (!tribe) return ''

  const halfWidth = 104
  const halfHeight = 84
  const { TRIBE_CX: cx, TRIBE_CY: cy } = G
  const cartouche =
    `M${cx - halfWidth} ${cy}` +
    `Q${cx} ${cy - halfHeight} ${cx + halfWidth} ${cy}` +
    `Q${cx} ${cy + halfHeight} ${cx - halfWidth} ${cy}Z`

  const body = boostStrokes(tribe.body, G.STROKE_BOOST.tribe)
  const fit = G.fitTransform(tribe.bbox, cx, cy, G.TRIBE_RADIUS)

  return (
    `<g class="mh-tribe">` +
    `<path d="${cartouche}" fill="none" stroke="${style.mid}" stroke-width="3"/>` +
    `<g transform="${fit}">${body}</g>` +
    `</g>`
  )
}

interface ArcTextOptions {
  text: string
  centreAngle: number
  direction: 'ltr' | 'rtl'
  fontFamily: string
  fontSize: number
  colour: string
  letterClass: string
}

function renderArcText(options: ArcTextOptions): string {
  const { text, centreAngle, direction, fontFamily, colour, letterClass } = options
  if (!text) return ''

  const layout = G.layoutArcText(text, {
    centreAngle,
    direction,
    radius: G.ARC_RADIUS,
    fontSize: options.fontSize,
  })

  const glyphs = layout.glyphs
    .map(
      (glyph) =>
        `<text class="${letterClass}" x="${glyph.x}" y="${glyph.y}" ` +
        `transform="rotate(${glyph.rotation} ${glyph.x} ${glyph.y})" ` +
        `text-anchor="middle" dominant-baseline="central" ` +
        `font-family="${fontFamily}" font-size="${layout.fontSize}" fill="${colour}">` +
        `${escapeXml(glyph.char)}</text>`,
    )
    .join('')

  return `<g class="mh-arc">${glyphs}</g>`
}

/** Üst ve alt yayı ayıran rozetler. */
function renderDividers(style: SealStyle): string {
  return G.DIVIDER_ANGLES.map((angle) => {
    const point = G.polar(G.ARC_RADIUS, angle)
    return (
      `<g>` +
      diamond(point.x, point.y, 13, style.ink) +
      diamond(point.x, point.y, 5.5, style.ground) +
      `</g>`
    )
  }).join('')
}

/**
 * Onay öncesi filigran (AC-05).
 *
 * Sertifika sayfasında bu katman hiç üretilmez, gizlenmez: dosyada kalıntısı
 * bulunmaz (AC-06).
 */
function renderWatermark(style: SealStyle, clipId: string): string {
  const rows = [-300, -180, -60, 60, 180, 300]
  const lines = rows
    .map(
      (offset) =>
        `<text x="${G.CX}" y="${G.CY + offset}" text-anchor="middle" ` +
        `dominant-baseline="central" font-family="${LATIN_FONT_STACK}" ` +
        `font-size="52" letter-spacing="14" fill="${style.ink}">` +
        `${WATERMARK_LABEL} · ${WATERMARK_LABEL}</text>`,
    )
    .join('')

  return (
    `<g class="mh-watermark" clip-path="url(#${clipId})" opacity="0.09">` +
    `<g transform="rotate(-24 ${G.CX} ${G.CY})">${lines}</g>` +
    `</g>`
  )
}

/** Seçimlerden tam bir SVG belgesi kurar. */
export function composeSeal(input: SealComposition): string {
  const { style, idSuffix = 'live' } = input
  const clipId = `mh-clip-${idSuffix}`

  const latin = input.latinName.trim().toLocaleUpperCase('tr-TR')

  const layers = [
    renderRings(style),
    renderBand(input.frame, style),
    renderArcText({
      text: latin,
      centreAngle: -90,
      direction: 'ltr',
      fontFamily: LATIN_FONT_STACK,
      fontSize: 44,
      colour: style.ink,
      letterClass: 'mh-latin',
    }),
    renderArcText({
      text: input.orkhonText,
      centreAngle: 90,
      direction: 'rtl',
      fontFamily: ORKHON_FONT_STACK,
      fontSize: 42,
      colour: style.ink,
      letterClass: 'mh-orkhon',
    }),
    renderDividers(style),
    renderSymbol(input.symbol),
    renderTribe(input.tribe, style),
    input.watermark ? renderWatermark(style, clipId) : '',
  ].join('')

  const fontFaces = input.fontFaceCss ? `<style>${input.fontFaceCss}</style>` : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${G.CANVAS} ${G.CANVAS}" ` +
    `width="${G.CANVAS}" height="${G.CANVAS}" role="img">` +
    fontFaces +
    `<defs><clipPath id="${clipId}">` +
    `<circle cx="${G.CX}" cy="${G.CY}" r="${G.OUTER_RADIUS}"/>` +
    `</clipPath></defs>` +
    `<style>` +
    `.s0{stroke:${style.ink}}.s1{stroke:${style.mid}}.s2{stroke:${style.accent}}` +
    `.sn{stroke:none}` +
    `.f0{fill:${style.ink}}.f1{fill:${style.mid}}.f2{fill:${style.accent}}.fn{fill:none}` +
    `</style>` +
    layers +
    `</svg>`
  )
}

/** Mührün boş olup olmadığı; stüdyodaki boş durum mesajı için (T9). */
export function isCompositionEmpty(input: SealComposition): boolean {
  return !input.frame && !input.symbol && !input.tribe && input.latinName.trim() === ''
}
