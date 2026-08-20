import { describe, expect, it } from 'vitest'

import { loadCatalog, orkhonMap } from '@/data/catalog'
import { OrkhonAlphabet } from '@/seal/orkhon'

describe('katalog metinleri', () => {
  const catalog = loadCatalog()
  const all = catalog.slots.flatMap((slot) => slot.motifs)

  function motif(id: string) {
    const found = all.find((entry) => entry.id === id)
    if (!found) throw new Error(`Motif yok: ${id}`)
    return found
  }

  it('her motifin tarihçesi ve en az bir kaynağı vardır', () => {
    expect(all).toHaveLength(15)
    for (const entry of all) {
      expect(entry.history.length).toBeGreaterThan(80)
      expect(entry.citations.length).toBeGreaterThan(0)
    }
  })

  it('Salur Üçok kolundadır, Bozok değildir', () => {
    const salur = motif('2.3')
    expect(salur.blurb).toMatch(/Üçok/)
    expect(salur.history).toMatch(/Üçok/)
    expect(salur.history).not.toMatch(/Bozok kolunun/)
    expect(salur.citations.some((item) => item.includes('Salur'))).toBe(true)
  })

  it('Kınık Üçok, Kayı ve Afşar Bozok olarak kalır', () => {
    expect(motif('2.1').blurb).toMatch(/Bozok/)
    expect(motif('2.2').blurb).toMatch(/Üçok/)
    expect(motif('2.4').blurb).toMatch(/Bozok/)
    expect(motif('2.5').blurb).toMatch(/Üçok/)
  })

  it('vitrin adı Türkiye gerçek Orhun çevirisiyle yazılır', () => {
    const text = new OrkhonAlphabet(orkhonMap).transliterate('Türkiye').text
    expect(text.length).toBeGreaterThan(0)
    expect(text).not.toBe('𐰇𐰚𐰼𐰇𐱅')
    expect(/[\u{10C00}-\u{10C48}]/u.test(text)).toBe(true)
  })
})
