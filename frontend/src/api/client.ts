/** Arka uç istemcisi. */

import type {
  Catalog,
  CertificateText,
  OrkhonMap,
  SealSpecPayload,
  ShareRecord,
} from './types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { detail?: string }) => body.detail)
      .catch(() => undefined)
    throw new Error(detail ?? `İstek başarısız (${response.status})`)
  }

  return response.json() as Promise<T>
}

export function fetchCatalog(): Promise<Catalog> {
  return request<Catalog>('/catalog')
}

export function fetchOrkhonMap(): Promise<OrkhonMap> {
  return request<OrkhonMap>('/orkhon/map')
}

export function fetchCertificateText(spec: SealSpecPayload): Promise<CertificateText> {
  return request<CertificateText>('/certificate-text', {
    method: 'POST',
    body: JSON.stringify(spec),
  })
}

export function createShare(spec: SealSpecPayload): Promise<ShareRecord> {
  return request<ShareRecord>('/share', {
    method: 'POST',
    body: JSON.stringify(spec),
  })
}

export function fetchShare(code: string): Promise<ShareRecord> {
  return request<ShareRecord>(`/share/${encodeURIComponent(code)}`)
}

/**
 * Metrik olayı gönderir.
 *
 * Ateşle-unut: ölçüm hiçbir koşulda kullanıcı akışını yavaşlatmamalı, bu yüzden
 * beklenmez ve hataları yutulur.
 */
export function sendEvent(
  sessionId: string,
  event: string,
  payload?: Record<string, unknown>,
): void {
  const body = JSON.stringify({ sessionId, event, payload: payload ?? null })

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        `${BASE}/metrics/events`,
        new Blob([body], { type: 'application/json' }),
      )
      return
    }
  } catch {
    // sendBeacon kullanılamıyorsa fetch'e düşülür.
  }

  void fetch(`${BASE}/metrics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined)
}
