import tdtLogo from '../../../assets/tdt_logo.png'

interface LogoProps {
  size?: number
  className?: string
}

/** Kurumsal amblem; teşkilat adı yazılmaz. */
export default function Logo({ size = 44, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={tdtLogo}
        alt=""
        width={size}
        height={size}
        className="rounded-xl object-cover ring-1 ring-white/15"
        style={{ width: size, height: size }}
      />
    </div>
  )
}
