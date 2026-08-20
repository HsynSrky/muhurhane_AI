/**
 * İsteğe bağlı metrik ucu.
 *
 * Canlı sürüm statik dosyadır; olaylar yalnızca `VITE_METRICS_URL` tanımlıysa
 * gönderilir. Ölçüm asla kullanıcı akışını bekletmez.
 */

export function sendEvent(
  sessionId: string,
  event: string,
  payload?: Record<string, unknown>,
): void {
  const endpoint = import.meta.env.VITE_METRICS_URL
  if (!endpoint) return

  const body = JSON.stringify({ sessionId, event, payload: payload ?? null })

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }))
      return
    }
  } catch {
    // sendBeacon yoksa fetch'e düşülür.
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined)
}
