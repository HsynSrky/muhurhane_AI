/** Motif kartlarındaki küçük önizlemeler. */

import type { Motif } from '@/api/types'

interface ThumbColours {
  ink: string
  mid: string
  accent: string
}

/**
 * Motifi kendi sınır kutusuna oturtulmuş küçük bir SVG olarak döndürür.
 *
 * Kart boyutunda ham çizgiler 1 px'in altına indiği için kalınlıklar
 * yükseltiliyor; oranlar korunduğundan motifin karakteri bozulmuyor.
 */
export function motifThumbSvg(
  motif: Motif,
  colours: ThumbColours,
  { padding = 14, strokeBoost = 1.7 }: { padding?: number; strokeBoost?: number } = {},
): string {
  const [x, y, width, height] = motif.bbox
  const side = Math.max(width, height) + padding * 2
  const viewX = x + width / 2 - side / 2
  const viewY = y + height / 2 - side / 2

  const body = motif.body.replace(
    /stroke-width="([\d.]+)"/g,
    (_match, value: string) => `stroke-width="${(Number(value) * strokeBoost).toFixed(2)}"`,
  )

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewX.toFixed(1)} ${viewY.toFixed(1)} ${side.toFixed(1)} ${side.toFixed(1)}" aria-hidden="true">` +
    `<style>` +
    `.s0{stroke:${colours.ink}}.s1{stroke:${colours.mid}}.s2{stroke:${colours.accent}}.sn{stroke:none}` +
    `.f0{fill:${colours.ink}}.f1{fill:${colours.mid}}.f2{fill:${colours.accent}}.fn{fill:none}` +
    `</style>` +
    body +
    `</svg>`
  )
}
