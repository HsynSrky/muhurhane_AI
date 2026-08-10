// Üretim derlemesinde LCP ölçümü. Hedef: PRD/plan 6. bölüm, LCP < 1.5s.
// Soğuk önbellekle, her rota için ayrı sekmede ölçülür.
import { chromium } from 'playwright'

const BASE = process.env.PERF_BASE ?? 'http://localhost:4173'
const RUNS = 3

const OBSERVE = `
  new Promise((resolve) => {
    let last = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) last = entry.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    const finish = () => {
      const nav = performance.getEntriesByType('navigation')[0]
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]
      resolve({
        lcp: last,
        fcp: fcp ? fcp.startTime : null,
        domReady: nav ? nav.domContentLoadedEventEnd : null,
        transferKb: performance.getEntriesByType('resource')
          .reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024,
      })
    }
    if (document.readyState === 'complete') setTimeout(finish, 600)
    else addEventListener('load', () => setTimeout(finish, 600))
  })
`

const browser = await chromium.launch()
const rows = []

for (const [label, path] of [
  ['Landing', '/'],
  ['Stüdyo', '/atolye'],
]) {
  const samples = []
  for (let i = 0; i < RUNS; i += 1) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await page.goto(BASE + path, { waitUntil: 'load' })
    const sample = await page.evaluate(OBSERVE)
    // Katalog gelmediyse sayfa boş boyanır ve LCP yanıltıcı biçimde iyi çıkar.
    sample.cards = await page.locator('svg, img').count()
    samples.push(sample)
    await context.close()
  }
  const median = (key) => {
    const values = samples.map((s) => s[key] ?? 0).sort((a, b) => a - b)
    return values[Math.floor(values.length / 2)]
  }
  rows.push({
    label,
    lcp: median('lcp'),
    fcp: median('fcp'),
    dom: median('domReady'),
    kb: median('transferKb'),
    painted: samples.every((s) => s.cards > 0),
  })
}

await browser.close()

const BUDGET = 1500
let failed = false
console.log('')
console.log('ROTA      LCP        FCP        DOM        AKTARIM    İÇERİK     DURUM')
console.log('-'.repeat(74))
for (const r of rows) {
  const ok = r.lcp < BUDGET && r.painted
  if (!ok) failed = true
  console.log(
    `${r.label.padEnd(10)}${(Math.round(r.lcp) + 'ms').padEnd(11)}` +
      `${(Math.round(r.fcp) + 'ms').padEnd(11)}${(Math.round(r.dom) + 'ms').padEnd(11)}` +
      `${(Math.round(r.kb) + 'kB').padEnd(11)}${(r.painted ? 'boyandı' : 'BOŞ').padEnd(11)}` +
      `${ok ? 'GEÇTİ' : 'KALDI'}`,
  )
}
console.log('-'.repeat(74))
console.log(`bütçe: LCP < ${BUDGET}ms · ${failed ? 'BAŞARISIZ' : 'tüm rotalar bütçe içinde'}`)
process.exit(failed ? 1 : 0)
