/**
 * Alt yaydaki Orhun metninin sağdan sola dizildiğini doğrular.
 *
 * Kural: ilk kelime en sağda başlar. "Eren Bey" için 4 harfli "Eren" sağ
 * kümede, 3 harfli "Bey" sol kümede olmalı.
 */

import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:5173'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(`${BASE}/atolye`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /Çift Başlı Kartal/ }).first().click()
await page.getByLabel('Adınız').fill('Eren Bey')
await page.waitForTimeout(600)

const glyphs = await page.$$eval('aside svg .mh-orkhon', (nodes) =>
  nodes.map((node) => ({
    char: node.textContent ?? '',
    x: Number(node.getAttribute('x')),
  })),
)

const sorted = [...glyphs].sort((a, b) => b.x - a.x)
const rightToLeft = sorted.map((glyph) => glyph.char).join('')
const documentOrder = glyphs.map((glyph) => glyph.char).join('')

console.log('belge sırası (ilk→son) :', [...documentOrder].map((c) => c.codePointAt(0)?.toString(16)).join(' '))
console.log('sağdan sola okunuş     :', [...rightToLeft].map((c) => c.codePointAt(0)?.toString(16)).join(' '))
console.log('beklenen               : 10c00 10c3c 10c00 10c24 2009 10c0b 10c00 10c18')
console.log(
  rightToLeft === documentOrder
    ? 'SONUÇ: sağdan sola dizilim DOĞRU (ilk harf en sağda).'
    : 'SONUÇ: HATA — dizilim soldan sağa gidiyor.',
)

await browser.close()
