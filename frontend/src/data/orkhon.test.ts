import { describe, expect, it } from 'vitest'

import { orkhonMap } from '@/data/catalog'
import { OrkhonAlphabet } from '@/seal/orkhon'

const alphabet = new OrkhonAlphabet(orkhonMap)

function hex(text: string): string {
  return [...text].map((char) => char.codePointAt(0)!.toString(16)).join(' ')
}

describe('OrkhonAlphabet', () => {
  it('Eren Bey adını Orhun karakterlerine çevirir', () => {
    const result = alphabet.transliterate('Eren Bey')
    expect(result.words).toHaveLength(2)
    expect(result.words[0]?.latin).toBe('Eren')
    expect(result.words[1]?.latin).toBe('Bey')
    expect(result.words[0]?.harmony).toBe('front')
    expect(hex(result.text)).toBe('10c00 10c3c 10c00 10c24 2009 10c0b 10c00 10c18')
  })

  it('Ahmet gibi karışık ünlülü adda h/k kalın heceye bağlanır', () => {
    const result = alphabet.transliterate('Ahmet')
    expect(result.words[0]?.harmony).toBe('mixed')
    expect(hex(result.text)).toBe('10c00 10c34 10c22 10c00 10c45')
    expect(result.notes.some((note) => note.includes('Karışık ünlülü'))).toBe(true)
  })

  it('Ayşe: y kalın (Ay), ş ince (şe)', () => {
    const result = alphabet.transliterate('Ayşe')
    expect(result.words[0]?.harmony).toBe('mixed')
    expect(hex(result.text)).toBe('10c00 10c16 10c41 10c00')
  })

  it('Köksal: kök ince yuvarlak, sal kalın kalır', () => {
    const result = alphabet.transliterate('Köksal')
    expect(result.words[0]?.harmony).toBe('mixed')
    expect(hex(result.text)).toBe('10c1c 10c07 10c1c 10c3d 10c00 10c1e')
  })

  it('Yasemin hece hece yazılır', () => {
    const result = alphabet.transliterate('Yasemin')
    expect(hex(result.text)).toBe('10c16 10c00 10c3e 10c00 10c22 10c03 10c24')
  })

  it('kış’ta k, ı komşuluğunda IQ biçimini alır', () => {
    const result = alphabet.transliterate('kış')
    expect(hex(result.text)).toBe('10c36 10c03 10c3f')
  })

  it('Türkçe I/İ ayrımını korur', () => {
    const dotted = alphabet.transliterate('İl')
    const dotless = alphabet.transliterate('Il')
    expect(hex(dotted.text)).toBe('10c03 10c20')
    expect(hex(dotless.text)).toBe('10c03 10c1e')
  })

  it('boş metinde boş sonuç döner', () => {
    expect(alphabet.transliterate('   ').words).toEqual([])
  })
})
