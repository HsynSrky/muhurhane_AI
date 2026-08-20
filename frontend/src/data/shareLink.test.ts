import { describe, expect, it } from 'vitest'

import { buildShareUrl, specFromSearchParams, specToSearchParams } from '@/data/shareLink'

const spec = {
  frameId: '3.1',
  symbolId: '1.1',
  tribeId: '2.1',
  latinName: 'Eren Bey',
  styleId: 'antik-tunc' as const,
}

describe('shareLink', () => {
  it('seçimi sorgu parametrelerine yazar ve geri okur', () => {
    const params = specToSearchParams(spec)
    expect(params.get('f')).toBe('3.1')
    expect(params.get('n')).toBe('Eren Bey')
    expect(params.get('c')).toBe('antik-tunc')
    expect(specFromSearchParams(params)).toEqual(spec)
  })

  it('varsayılan stili URL’ye yazmaz', () => {
    const params = specToSearchParams({ ...spec, styleId: 'acik-turkuaz' })
    expect(params.get('c')).toBeNull()
    expect(specFromSearchParams(params)?.styleId).toBe('acik-turkuaz')
  })

  it('boş parametrelerde null döner', () => {
    expect(specFromSearchParams(new URLSearchParams())).toBeNull()
  })

  it('paylaşım URL’si sertifika yolunu taşır', () => {
    const url = buildShareUrl('https://ornek.test', spec)
    expect(url.startsWith('https://ornek.test/sertifika?')).toBe(true)
    expect(url).toContain('n=Eren+Bey')
  })
})
