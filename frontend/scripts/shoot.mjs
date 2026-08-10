/**
 * Görsel doğrulama yardımcısı.
 *
 * Akışın üç ekranını gerçek tarayıcıda gezip ekran görüntüsü alır. Kabul
 * kriterlerinin (AC-01..AC-06) elle kontrolü bunun üzerinden yapılıyor.
 *
 * Kullanım: node scripts/shoot.mjs [taban-url]
 */

import { mkdir, stat } from 'node:fs/promises'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const OUT = 'screenshots'

const VIEWPORT = { width: 1440, height: 900 }

async function main() {
  await mkdir(OUT, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 })
  const page = await context.newPage()

  const problems = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))

  // 1 · Landing
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/1-landing.png` })

  // 2 · Studio, üç slot seçili + isim
  await page.getByRole('link', { name: /Atölyeye Gir/i }).click()
  await page.waitForURL('**/atolye')
  await page.waitForTimeout(700)

  await page.getByRole('button', { name: /Selçuklu Yıldızı/ }).first().click()
  await page.getByRole('button', { name: /Çift Başlı Kartal/ }).first().click()
  await page.getByRole('button', { name: /Kayı Damgası/ }).first().click()
  await page.getByLabel('Adınız').fill('Eren Bey')
  await page.waitForTimeout(900)

  // Tıklamalar sol paneli kaydırmış olabilir; ilk görünüm için başa dönülür.
  await page.evaluate(() => {
    for (const node of document.querySelectorAll('main > div, main > aside > div')) {
      node.scrollTop = 0
    }
  })
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${OUT}/2-studio.png` })

  // Ana akış 1440x900'de kaydırma istememeli (kalite hedefi §9).
  const overflow = await page.evaluate(() => {
    const panes = {
      sol: document.querySelector('main > div'),
      sag: document.querySelector('main > aside > div'),
    }
    return Object.fromEntries(
      Object.entries(panes).map(([name, node]) => [
        name,
        node ? node.scrollHeight - node.clientHeight : -1,
      ]),
    )
  })
  // Üç motif şeridi kaydırmadan görünmeli; tarihçe kartı için kaydırma serbest.
  const stripsFit = await page.evaluate(() => {
    const sections = [...document.querySelectorAll('main > div > section')]
    const last = sections.at(-1)
    if (!last) return null
    return Math.round(last.getBoundingClientRect().bottom - window.innerHeight)
  })

  console.log(
    `Sağ sütun taşması: ${overflow['sag']} px${overflow['sag'] > 0 ? '  ⚠' : '  ✓'} · ` +
      `Üçüncü şeridin alt kenarı: ${stripsFit > 0 ? `${stripsFit} px taşıyor  ⚠` : `${-stripsFit} px pay  ✓`} · ` +
      `Sol sütun toplam taşma (tarihçe dahil): ${overflow['sol']} px`,
  )

  // Mührün tek başına okunurluğu
  await page
    .locator('aside [role="img"] svg')
    .first()
    .screenshot({ path: `${OUT}/3-seal-simulasyon.png` })

  // 3 · Sertifika
  await page.getByRole('button', { name: /Onayla/ }).click()
  await page.waitForURL('**/sertifika')
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/4-sertifika.png` })
  await page.locator('[role="img"] svg').first().screenshot({ path: `${OUT}/5-seal-final.png` })

  // 4 · HD PNG dışa aktarımı (AC-06): fontların gömülmesi burada sınanıyor.
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 45_000 }),
    page.getByRole('button', { name: /HD mührü indir/ }).click(),
  ])
  const target = `${OUT}/6-${download.suggestedFilename()}`
  await download.saveAs(target)
  const { size } = await stat(target)
  console.log(`PNG indirildi: ${download.suggestedFilename()} · ${(size / 1024).toFixed(0)} KB`)

  console.log(problems.length ? `SORUN:\n${problems.join('\n')}` : 'Konsol temiz.')
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
