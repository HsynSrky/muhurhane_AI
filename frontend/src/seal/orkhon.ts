/**
 * Latin → Orhun çeviriyazısı (docs/PRD-tamamlayici.md §7).
 *
 * Harf tabloları arka uçtaki `backend/data/orkhon_map.json` dosyasından gelir ve
 * `/api/orkhon/map` ile servis edilir; kural tabloları tek kaynakta durur.
 * Algoritma burada çalışır, çünkü önizlemenin kullanıcı yazarken tek karede
 * güncellenmesi gerekiyor — her tuş vuruşunda sunucuya gidilemez.
 *
 * Python karşılığı: `backend/app/domain/transliteration.py`.
 */

import type { OrkhonMap } from '@/api/types'

export type Harmony = 'back' | 'front'

export interface OrkhonLetter {
  latin: string
  orkhon: string
  note?: string
}

export interface OrkhonWord {
  latin: string
  orkhon: string
  harmony: Harmony
  letters: OrkhonLetter[]
}

export interface OrkhonResult {
  source: string
  text: string
  words: OrkhonWord[]
  /** Alfabede karşılığı olmayan seslerin nasıl eşlendiğine dair açıklamalar. */
  notes: string[]
}

const MAX_ALIAS_DEPTH = 4
const LETTER = /\p{L}/u

export const EMPTY_RESULT: OrkhonResult = { source: '', text: '', words: [], notes: [] }

function glyph(codepoint: string): string {
  return String.fromCodePoint(Number.parseInt(codepoint, 16))
}

/** Türkçeye özgü büyük harf çifti: I→ı, İ→i. */
function toTurkishLower(value: string): string {
  return value.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase()
}

/** Tabloları bir kez çözümleyip yeniden kullanılabilir bir motora çevirir. */
export class OrkhonAlphabet {
  private readonly back: Set<string>
  private readonly front: Set<string>
  private readonly rounded: Set<string>
  private readonly vowels: Map<string, string>
  private readonly dual: Map<string, Record<Harmony, string>>
  private readonly single: Map<string, string>
  private readonly quad: Map<string, Record<string, string>>
  private readonly digraphs: Record<string, string>
  private readonly aliases: Record<string, string>
  private readonly approximations: Record<string, string>
  readonly wordSeparator: string
  readonly direction: string

  constructor(table: OrkhonMap) {
    this.back = new Set(table.vowelClasses.back)
    this.front = new Set(table.vowelClasses.front)
    this.rounded = new Set(table.vowelClasses.rounded)
    this.vowels = new Map(Object.entries(table.vowels).map(([k, v]) => [k, glyph(v)]))
    this.dual = new Map(
      Object.entries(table.dual).map(([k, v]) => [
        k,
        { back: glyph(v.back), front: glyph(v.front) },
      ]),
    )
    this.single = new Map(Object.entries(table.single).map(([k, v]) => [k, glyph(v)]))
    this.quad = new Map(
      Object.entries(table.quad).map(([k, forms]) => [
        k,
        Object.fromEntries(Object.entries(forms).map(([f, c]) => [f, glyph(c)])),
      ]),
    )
    this.digraphs = table.digraphs
    this.aliases = table.aliases
    this.approximations = table.approximations
    this.wordSeparator = glyph(table.wordSeparator)
    this.direction = table.direction
  }

  transliterate(source: string): OrkhonResult {
    const words: OrkhonWord[] = []
    const notes = new Set<string>()

    for (const rawWord of source.split(/\s+/)) {
      if (!rawWord) continue
      const letters = this.lettersOf(rawWord)
      if (letters.length === 0) continue

      const harmony = this.harmonyOf(letters)
      const rendered = this.renderWord(letters, harmony)
      if (rendered.length === 0) continue

      for (const letter of rendered) {
        if (letter.note) notes.add(letter.note)
      }

      words.push({
        latin: rawWord,
        orkhon: rendered.map((letter) => letter.orkhon).join(''),
        harmony,
        letters: rendered,
      })
    }

    return {
      source,
      text: words.map((word) => word.orkhon).join(this.wordSeparator),
      words,
      notes: [...notes],
    }
  }

  private lettersOf(word: string): string[] {
    return [...toTurkishLower(word)].filter((char) => LETTER.test(char))
  }

  private isVowel(letter: string): boolean {
    return this.vowels.has(letter)
  }

  /** Kelimenin ünlü sınıfı; belirleyici son ünlüdür (kural §7.5/2). */
  private harmonyOf(letters: string[]): Harmony {
    for (let index = letters.length - 1; index >= 0; index -= 1) {
      const letter = letters[index]!
      if (this.front.has(letter)) return 'front'
      if (this.back.has(letter)) return 'back'
    }
    return 'back'
  }

  /** `k` biçimini seçmek için en yakın ünlü: önce sonraki, sonra önceki. */
  private nearestVowel(letters: string[], index: number): string | null {
    for (let step = index + 1; step < letters.length; step += 1) {
      if (this.isVowel(letters[step]!)) return letters[step]!
    }
    for (let step = index - 1; step >= 0; step -= 1) {
      if (this.isVowel(letters[step]!)) return letters[step]!
    }
    return null
  }

  private resolveAlias(letter: string): { base: string; note?: string } {
    const note = this.approximations[letter]
    let current = letter
    for (let depth = 0; depth < MAX_ALIAS_DEPTH; depth += 1) {
      const next = this.aliases[current]
      if (next === undefined || next === current) break
      current = next
    }
    return note ? { base: current, note } : { base: current }
  }

  private renderWord(letters: string[], harmony: Harmony): OrkhonLetter[] {
    const rendered: OrkhonLetter[] = []
    let index = 0

    while (index < letters.length) {
      let latin = letters[index]!
      let consumed = 1

      const pair = letters.slice(index, index + 2).join('')
      if (pair.length === 2 && this.digraphs[pair] !== undefined) {
        latin = pair
        consumed = 2
      }

      const mapped = this.digraphs[latin] ?? latin
      const { base, note } = this.resolveAlias(mapped)
      const character = this.glyphFor(base, letters, index, harmony)
      if (character !== null) {
        rendered.push(note ? { latin, orkhon: character, note } : { latin, orkhon: character })
      }
      index += consumed
    }

    return rendered
  }

  private glyphFor(
    base: string,
    letters: string[],
    index: number,
    harmony: Harmony,
  ): string | null {
    const vowel = this.vowels.get(base)
    if (vowel !== undefined) return vowel

    const single = this.single.get(base)
    if (single !== undefined) return single

    const dual = this.dual.get(base)
    if (dual !== undefined) return dual[harmony]

    const quad = this.quad.get(base)
    if (quad !== undefined) return this.quadGlyph(quad, letters, index, harmony)

    return null
  }

  /** `k` dört biçimlidir: ünlü sınıfı + komşu ünlünün yuvarlaklığı (§7.4). */
  private quadGlyph(
    forms: Record<string, string>,
    letters: string[],
    index: number,
    harmony: Harmony,
  ): string {
    const neighbour = this.nearestVowel(letters, index)
    const rounded = neighbour !== null && this.rounded.has(neighbour)

    if (harmony === 'front') {
      return (rounded ? forms['frontRounded'] : forms['frontPlain']) ?? forms['frontPlain']!
    }
    if (rounded) return forms['backRounded']!
    if (neighbour === 'ı') return forms['backDotless']!
    return forms['backPlain']!
  }
}
