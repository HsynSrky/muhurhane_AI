import tdtLogo from '../../../assets/tdt_logo.png'

interface LogoProps {
  size?: number
  withWordmark?: boolean
  className?: string
}

/**
 * TDT amblemi.
 *
 * Kaynak dosya turkuaz zeminli kurumsal kilit; yeniden çizmek yerine olduğu
 * gibi kullanılıyor, yalnızca yuvarlatılmış bir levhaya oturtuluyor.
 */
export default function Logo({ size = 44, withWordmark = false, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={tdtLogo}
        alt="Türk Devletleri Teşkilatı amblemi"
        width={size}
        height={size}
        className="rounded-xl object-cover ring-1 ring-white/15"
        style={{ width: size, height: size }}
      />
      {withWordmark && (
        <span className="text-sm leading-tight font-medium text-[var(--color-muted)]">
          Türk Devletleri
          <br />
          Teşkilatı
        </span>
      )}
    </div>
  )
}
