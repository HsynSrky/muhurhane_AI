/** Mühür seçimini URL sorgu parametrelerine yazar; sunucu / kısa kod yok. */

import type { SealSpecPayload, StyleId } from '@/api/types'

const STYLES = new Set<StyleId>(['acik-turkuaz', 'antik-tunc', 'gece-lacivert'])

function asStyle(value: string | null): StyleId {
  if (value && STYLES.has(value as StyleId)) return value as StyleId
  return 'acik-turkuaz'
}

function cleanId(value: string | null): string | null {
  const id = value?.trim() ?? ''
  return id.length > 0 && id.length <= 8 ? id : null
}

export function specToSearchParams(spec: SealSpecPayload): URLSearchParams {
  const params = new URLSearchParams()
  if (spec.frameId) params.set('f', spec.frameId)
  if (spec.symbolId) params.set('s', spec.symbolId)
  if (spec.tribeId) params.set('t', spec.tribeId)
  if (spec.latinName.trim()) params.set('n', spec.latinName.trim())
  if (spec.styleId !== 'acik-turkuaz') params.set('c', spec.styleId)
  return params
}

export function specFromSearchParams(params: URLSearchParams): SealSpecPayload | null {
  const frameId = cleanId(params.get('f'))
  const symbolId = cleanId(params.get('s'))
  const tribeId = cleanId(params.get('t'))
  const latinName = (params.get('n') ?? '').trim().slice(0, 24)
  const styleId = asStyle(params.get('c'))

  if (!frameId && !symbolId && !tribeId && !latinName) return null

  return { frameId, symbolId, tribeId, latinName, styleId }
}

export function buildShareUrl(origin: string, spec: SealSpecPayload, baseUrl = '/'): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const query = specToSearchParams(spec).toString()
  const path = `${origin}${base}/sertifika`
  return query ? `${path}?${query}` : path
}
