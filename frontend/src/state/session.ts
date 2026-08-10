/** Oturum kimliği ve metrik olayları (PRD §13). */

import { sendEvent } from '@/api/client'

const SESSION_KEY = 'muhurhane.session'
const START_KEY = 'muhurhane.started'

function readOrCreate(key: string, create: () => string): string {
  try {
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const value = create()
    sessionStorage.setItem(key, value)
    return value
  } catch {
    // Gizli sekmede sessionStorage kapalı olabilir; ölçüm sessizce devre dışı kalır.
    return create()
  }
}

export function getSessionId(): string {
  return readOrCreate(SESSION_KEY, () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  )
}

export function getSessionStart(): number {
  return Number(readOrCreate(START_KEY, () => String(Date.now())))
}

export function track(event: string, payload?: Record<string, unknown>): void {
  sendEvent(getSessionId(), event, payload)
}

const fired = new Set<string>()

/**
 * Sayfa görüntüleme gibi oturumda bir kez sayılması gereken olaylar.
 * React StrictMode geliştirmede efektleri iki kez çalıştırır; koruma buradan.
 */
export function trackOnce(event: string, payload?: Record<string, unknown>): void {
  if (fired.has(event)) return
  fired.add(event)
  track(event, payload)
}

export function elapsedSeconds(): number {
  return Math.max(0, Math.round((Date.now() - getSessionStart()) / 1000))
}
