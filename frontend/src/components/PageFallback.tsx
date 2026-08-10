export default function PageFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <span className="size-10 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-turkuaz)]" />
        <p className="text-sm text-[var(--color-muted)]">Atölye hazırlanıyor…</p>
      </div>
    </div>
  )
}
