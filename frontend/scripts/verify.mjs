/**
 * PRD §12 kabul kriterleri (AC-01..AC-06) ve §15 elle test listesi (T1..T9)
 * için otomatik doğrulama.
 *
 * T10 (yeni SVG ekleme) katalog derleme zamanında üretildiği için ayrı bir
 * betikle koşulur: scripts/verify-t10.ps1
 *
 * Kullanım: node scripts/verify.mjs [taban-url]
 */

import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const API = process.argv[3] ?? 'http://127.0.0.1:8000'

const results = []
let browser

function check(id, title, passed, detail = '') {
  results.push({ id, title, passed, detail })
}

async function expectThrows(id, title, fn) {
  try {
    const outcome = await fn()
    check(id, title, outcome.passed, outcome.detail)
  } catch (error) {
    check(id, title, false, error.message.split('\n')[0])
  }
}

/**
 * Bir katmanın 1000x1000 mühür uzayındaki sınır kutusu.
 *
 * `getBBox()` öğenin kendi dönüşümünü hesaba katmaz; motifler ölçekli birer
 * gruba sarıldığı için ekran dikdörtgeni üzerinden geri çevirmek gerekiyor.
 */
const BBOX = (selector) => `
  (() => {
    const node = document.querySelector(${JSON.stringify(selector)})
    if (!node) return null
    const svg = node.ownerSVGElement
    const root = svg.getBoundingClientRect()
    const box = node.getBoundingClientRect()
    const scale = 1000 / root.width
    return {
      x: (box.x - root.x) * scale,
      y: (box.y - root.y) * scale,
      w: box.width * scale,
      h: box.height * scale,
    }
  })()
`

const intersects = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

const maxCornerRadius = (box) => {
  const corners = [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x, box.y + box.h],
    [box.x + box.w, box.y + box.h],
  ]
  return Math.max(...corners.map(([x, y]) => Math.hypot(x - 500, y - 500)))
}

async function main() {
  browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  })
  const page = await context.newPage()

  const consoleErrors = []
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
  page.on('pageerror', (e) => consoleErrors.push(e.message))

  // ---------------------------------------------------------------- T1
  await expectThrows('T1', 'Sunucular ayakta (FastAPI + Vite)', async () => {
    const api = await fetch(`${API}/api/health`).then((r) => r.json())
    const web = await fetch(BASE).then((r) => r.status)
    return {
      passed: api.status === 'ok' && web === 200,
      detail: `api=${api.status} web=${web}`,
    }
  })

  // ------------------------------------------------------------- AC-01
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await expectThrows('AC-01', 'Landing: TDT logosu + başlık + CTA', async () => {
    const logo = await page.getByAltText(/Türk Devletleri Teşkilatı/).isVisible()
    const title = await page.getByRole('heading', { name: /Mühürhane/ }).isVisible()
    const cta = await page.getByRole('link', { name: /Atölyeye Gir/ }).isVisible()
    return { passed: logo && title && cta, detail: `logo=${logo} başlık=${title} cta=${cta}` }
  })

  // ---------------------------------------------------------------- T2
  await expectThrows('T2', 'Landing CTA stüdyoya geçer', async () => {
    await page.getByRole('link', { name: /Atölyeye Gir/ }).click()
    await page.waitForURL('**/atolye')
    return { passed: page.url().endsWith('/atolye'), detail: page.url() }
  })

  // ---------------------------------------------------------------- T9
  await expectThrows('T9', 'Hiç motif seçilmeden boş durum mesajı', async () => {
    const hint = page.getByText(/mühür burada belirsin/i)
    await hint.waitFor({ state: 'visible', timeout: 10_000 })
    return { passed: true, detail: ((await hint.textContent()) ?? '').slice(0, 46) }
  })

  // ------------------------------------------------------------- AC-05a
  await expectThrows('AC-05a', 'Stüdyoda HD indirme sunulmaz', async () => {
    const count = await page.getByRole('button', { name: /indir/i }).count()
    return { passed: count === 0, detail: `indirme düğmesi sayısı: ${count}` }
  })

  // ------------------------------------------------------------- AC-02
  await expectThrows('AC-02', 'Kartta blurb + dönem, seçince uzun tarihçe', async () => {
    const card = page.getByRole('button', { name: /Çift Başlı Kartal/ }).first()
    const blurbOnCard = (await card.textContent())?.includes('Hükümdarlık arması')
    await card.click()
    await page.waitForTimeout(400)
    const detail = page.locator('article', { hasText: 'Çift Başlı Kartal' })
    const history = (await detail.textContent()) ?? ''
    return {
      passed:
        Boolean(blurbOnCard) &&
        history.includes('Anadolu Selçuklu') &&
        history.includes('Divriği'),
      detail: `blurb=${blurbOnCard} dönem+tarihçe=${history.includes('Divriği')}`,
    }
  })

  // ---------------------------------------------------------------- T3
  await page.getByRole('button', { name: /Selçuklu Yıldızı/ }).first().click()
  await page.getByRole('button', { name: /Kayı Damgası/ }).first().click()
  await page.getByLabel('Adınız').fill('Eren Bey')
  await page.waitForTimeout(600)

  await expectThrows('T3', 'Üç slot + isim: simülasyon çizilir, filigran var', async () => {
    const band = await page.evaluate(BBOX('aside svg .mh-band'))
    const symbol = await page.evaluate(BBOX('aside svg .mh-symbol'))
    const tribe = await page.evaluate(BBOX('aside svg .mh-tribe'))
    const watermark = await page.locator('aside svg .mh-watermark').count()
    return {
      passed: Boolean(band && symbol && tribe) && watermark === 1,
      detail: `kuşak=${!!band} arma=${!!symbol} damga=${!!tribe} filigran=${watermark}`,
    }
  })

  // ------------------------------------------------------------- AC-03
  await expectThrows('AC-03', 'Üç motif ayrı bölgelerde, çakışma yok', async () => {
    const symbol = await page.evaluate(BBOX('aside svg .mh-symbol'))
    const tribe = await page.evaluate(BBOX('aside svg .mh-tribe'))
    const overlap = intersects(symbol, tribe)
    const symbolInside = maxCornerRadius(symbol) < 398
    const tribeInside = maxCornerRadius(tribe) < 398
    return {
      passed: !overlap && symbolInside && tribeInside,
      detail:
        `arma∩damga=${overlap ? 'ÇAKIŞIYOR' : 'yok'} · ` +
        `arma r=${maxCornerRadius(symbol).toFixed(0)} · damga r=${maxCornerRadius(tribe).toFixed(0)} (sınır 398)`,
    }
  })

  // ------------------------------------------------------------- AC-04
  await expectThrows('AC-04', 'Orhun karakterleri alt yaya işlenir', async () => {
    const glyphs = await page.$$eval('aside svg .mh-orkhon', (nodes) =>
      nodes.map((n) => ({ cp: (n.textContent ?? '').codePointAt(0) ?? 0, y: Number(n.getAttribute('y')) })),
    )
    const inBlock = glyphs.filter((g) => g.cp >= 0x10c00 && g.cp <= 0x10c48)
    const belowCentre = glyphs.every((g) => g.y > 500)
    return {
      passed: inBlock.length >= 7 && belowCentre,
      detail: `Old Turkic harfi: ${inBlock.length}/${glyphs.length} · hepsi alt yayda: ${belowCentre}`,
    }
  })

  // ---------------------------------------------------------------- T4
  await expectThrows('T4', 'Stil değişince renkler güncellenir', async () => {
    const before = await page.$eval('aside svg style', (n) => n.textContent)
    await page.getByRole('button', { name: 'Antik Tunç' }).click()
    await page.waitForTimeout(300)
    const after = await page.$eval('aside svg style', (n) => n.textContent)
    const bronze = after.includes('#463016')
    await page.getByRole('button', { name: 'TDT Açık Turkuaz' }).click()
    await page.waitForTimeout(300)
    return { passed: before !== after && bronze, detail: `tunç mürekkebi uygulandı: ${bronze}` }
  })

  // ---------------------------------------------------------------- T5
  await expectThrows('T5', 'Onayla → sertifika, filigran yok', async () => {
    await page.getByRole('button', { name: /Onayla/ }).click()
    await page.waitForURL('**/sertifika')
    await page.waitForTimeout(900)
    const watermark = await page.locator('svg .mh-watermark').count()
    const html = await page.content()
    return {
      passed: watermark === 0 && !html.includes('SİMÜLASYON'),
      detail: `filigran katmanı=${watermark} · belgede "SİMÜLASYON" geçmiyor=${!html.includes('SİMÜLASYON')}`,
    }
  })

  // -------------------------------------------------------- T6 / AC-06a
  await expectThrows('T6', 'Anı metni: isim + motifler + TDT 13. Buluşma', async () => {
    const text = (await page.locator('blockquote').textContent()) ?? ''
    const hasName = text.includes('Eren Bey')
    const hasMotifs =
      text.includes('Selçuklu Yıldızı') &&
      text.includes('Çift Başlı Kartal') &&
      text.includes('Kayı Damgası')
    const hasEvent = text.includes('TDT 13. Buluşma')
    return {
      passed: hasName && hasMotifs && hasEvent,
      detail: `isim=${hasName} motifler=${hasMotifs} etkinlik=${hasEvent}`,
    }
  })

  // ---------------------------------------------------------- T7 / AC-06
  await expectThrows('T7', 'PNG indirilir: 3000x3000, dairesel mühür', async () => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 45_000 }),
      page.getByRole('button', { name: /HD mührü indir/ }).click(),
    ])
    const path = await download.path()
    const base64 = (await readFile(path)).toString('base64')

    const probe = await page.evaluate(async (data) => {
      const image = new Image()
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        image.src = `data:image/png;base64,${data}`
      })
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0)
      const alphaAt = (x, y) => ctx.getImageData(x, y, 1, 1).data[3]
      const w = image.width
      const m = Math.round(w / 2)
      const inset = Math.round(w * 0.01)
      return {
        width: w,
        height: image.height,
        // Dört köşe saydam + dört kenar ortası dolu ⇒ içerik daire, kare değil.
        corners: [
          alphaAt(inset, inset),
          alphaAt(w - inset, inset),
          alphaAt(inset, w - inset),
          alphaAt(w - inset, w - inset),
        ],
        edges: [
          alphaAt(m, inset),
          alphaAt(m, w - inset),
          alphaAt(inset, m),
          alphaAt(w - inset, m),
        ],
        centre: alphaAt(m, m),
      }
    }, base64)

    const cornersClear = probe.corners.every((a) => a === 0)
    const edgesFilled = probe.edges.every((a) => a === 255)
    return {
      passed:
        probe.width === 3000 &&
        probe.height === 3000 &&
        cornersClear &&
        edgesFilled &&
        probe.centre === 255,
      detail:
        `${probe.width}x${probe.height} · köşeler saydam=${cornersClear} · ` +
        `kenar ortaları dolu=${edgesFilled} · merkez alfa=${probe.centre}`,
    }
  })

  // ---------------------------------------------------------------- T8
  await expectThrows('T8', 'Stüdyoya dönünce seçimler korunur', async () => {
    await page.getByRole('link', { name: /Düzenle/ }).click()
    await page.waitForURL('**/atolye')
    await page.waitForTimeout(600)
    const name = await page.getByLabel('Adınız').inputValue()
    const pressed = await page.$$eval('button[aria-pressed="true"]', (nodes) =>
      nodes.map((n) => n.textContent?.split('\n')[0]?.trim()).filter(Boolean),
    )
    return {
      passed: name === 'Eren Bey' && pressed.length >= 3,
      detail: `isim="${name}" · seçili kart sayısı=${pressed.length}`,
    }
  })

  // ------------------------------------------------------------ AC-05b
  await expectThrows('AC-05b', 'Onaysız sertifika URL’i uyarı verir', async () => {
    const fresh = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const clean = await fresh.newPage()
    await clean.goto(`${BASE}/sertifika`, { waitUntil: 'networkidle' })
    const warning = await clean
      .getByRole('heading', { name: /Önce mührünüzü onaylayın/ })
      .isVisible()
    const downloads = await clean.getByRole('button', { name: /indir/i }).count()
    await fresh.close()
    return { passed: warning && downloads === 0, detail: `uyarı=${warning} indirme=${downloads}` }
  })

  // ----------------------------------------------------- Erişilebilirlik
  await expectThrows('E1', 'Motif kartları klavyeyle seçilebilir', async () => {
    await page.goto(`${BASE}/atolye`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const card = page.getByRole('button', { name: /Koçboynuzu/ }).first()
    await card.focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    const pressed = await card.getAttribute('aria-pressed')
    return { passed: pressed === 'true', detail: `aria-pressed=${pressed}` }
  })

  await expectThrows('E2', 'prefers-reduced-motion: geçişler kapanır', async () => {
    const reduced = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    })
    const rp = await reduced.newPage()
    await rp.goto(BASE, { waitUntil: 'networkidle' })
    const duration = await rp.evaluate(() => {
      const node = document.querySelector('.btn-primary')
      return getComputedStyle(node).transitionDuration
    })
    await reduced.close()
    const off = duration.split(',').every((d) => Number.parseFloat(d) < 0.01)
    return { passed: off, detail: `transition-duration=${duration}` }
  })

  check('E3', 'Konsol hatasız', consoleErrors.length === 0, consoleErrors.join(' | ') || 'temiz')

  await browser.close()

  // ------------------------------------------------------------- Rapor
  const pad = (s, n) => String(s).padEnd(n)
  console.log(`\n${pad('#', 8)}${pad('DURUM', 8)}${pad('TEST', 46)}AYRINTI`)
  console.log('-'.repeat(120))
  for (const r of results) {
    console.log(`${pad(r.id, 8)}${pad(r.passed ? 'GEÇTİ' : 'KALDI', 8)}${pad(r.title, 46)}${r.detail}`)
  }
  const failed = results.filter((r) => !r.passed)
  console.log('-'.repeat(120))
  console.log(`${results.length - failed.length}/${results.length} geçti`)
  process.exit(failed.length ? 1 : 0)
}

main().catch(async (error) => {
  console.error(error)
  await browser?.close()
  process.exit(1)
})
