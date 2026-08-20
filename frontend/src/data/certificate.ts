/** Sertifika anı metni (PRD 11. bölüm). Sunucu gerekmez. */

export const FALLBACK_NAME = 'Değerli Konuk'
export const DEFAULT_PERIOD = 'Anadolu Selçuklu'

export interface CertificateText {
  body: string
  footer: string
  full: string
}

export function joinNames(names: string[]): string {
  if (names.length === 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} ve ${names[names.length - 1]}`
}

export function buildCertificateText(
  latinName: string,
  motifNames: string[],
  period: string = DEFAULT_PERIOD,
): CertificateText {
  const displayName = latinName.trim() || FALLBACK_NAME
  const body =
    motifNames.length === 0
      ? `${displayName}; bu damga ${period} dönemine ait motiflerle size özel üretilmiştir.`
      : `${displayName}; bu damga ${period} dönemine ait olup ${joinNames(motifNames)} motiflerini içerir. Size özel üretilmiştir.`

  return {
    body,
    footer: '',
    full: body,
  }
}
