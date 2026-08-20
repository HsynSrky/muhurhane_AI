import { describe, expect, it } from 'vitest'

import { buildCertificateText, FALLBACK_NAME, joinNames } from '@/data/certificate'

describe('joinNames', () => {
  it('tek adı olduğu gibi bırakır', () => {
    expect(joinNames(['Kayı Damgası'])).toBe('Kayı Damgası')
  })

  it('iki adı "A ve B" yapar', () => {
    expect(joinNames(['A', 'B'])).toBe('A ve B')
  })

  it('üç ve daha fazlasını virgül + ve ile birleştirir', () => {
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B ve C')
  })
})

describe('buildCertificateText', () => {
  it('isim boşsa Değerli Konuk kullanır', () => {
    const text = buildCertificateText('', ['Selçuklu Yıldızı'])
    expect(text.body.startsWith(FALLBACK_NAME)).toBe(true)
    expect(text.footer).toBe('')
    expect(text.full).toBe(text.body)
  })

  it('üç motifli şablonu üretir', () => {
    const text = buildCertificateText('Eren Bey', ['Kuşak', 'Arma', 'Damga'])
    expect(text.body).toBe(
      'Eren Bey; bu damga Anadolu Selçuklu dönemine ait olup Kuşak, Arma ve Damga motiflerini içerir. Size özel üretilmiştir.',
    )
  })

  it('motif yoksa genel cümle kurar', () => {
    const text = buildCertificateText('Ayşe', [])
    expect(text.body).toContain('motiflerle size özel üretilmiştir')
  })
})
