// T10: "assets/ klasörüne yeni bir SVG bırak, arayüzde kart olarak belirsin."
//
// Betik testi uçtan uca kurar ve söker: geçici bir motif dosyası yazar,
// normalize_motifs.py'yi koşturur, sunucu yeniden başlatılmadan kartın
// stüdyoda görünüp mühre işlendiğini ölçer, sonra her şeyi geri alır.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const WEB = process.env.T10_WEB ?? 'http://localhost:5173'
const venvUnix = join(ROOT, '.venv', 'bin', 'python')
const venvWin = join(ROOT, '.venv', 'Scripts', 'python.exe')
const PYTHON =
  process.env.T10_PYTHON ??
  (existsSync(venvUnix) ? venvUnix : existsSync(venvWin) ? venvWin : 'python3')

const MOTIF_ID = '2.9'
const MOTIF_NAME = 'T10 Deneme Damgası'
const SVG_PATH = join(ROOT, 'assets', 'selcuklu', `${MOTIF_ID}_T10_Deneme_Damgasi.svg`)
const CONTENT_PATH = join(ROOT, 'backend', 'data', 'motif_content.json')
const NORMALIZER = join(ROOT, 'backend', 'scripts', 'normalize_motifs.py')

const SVG = `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>.line{fill:none;stroke:#2B2B2B;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;}</style>
  </defs>
  <circle cx="200" cy="200" r="190" class="line" stroke-width="3"/>
  <path class="line" d="M150 110 L150 290"/>
  <path class="line" d="M250 110 L250 290"/>
  <path class="line" d="M150 200 L250 200"/>
</svg>
`

const contentBefore = readFileSync(CONTENT_PATH, 'utf8')
const normalize = () => execFileSync(PYTHON, [NORMALIZER], { cwd: ROOT, stdio: 'pipe' })

let result = { passed: false, detail: 'çalıştırılamadı' }

try {
  writeFileSync(SVG_PATH, SVG, 'utf8')
  const content = JSON.parse(contentBefore)
  content.motifs[MOTIF_ID] = {
    name: MOTIF_NAME,
    slot: 'tribe',
    blurb: 'T10 doğrulaması için geçici motif.',
    history: 'Bu motif yalnızca katalog genişletme testinde kullanılır.',
  }
  writeFileSync(CONTENT_PATH, `${JSON.stringify(content, null, 2)}\n`, 'utf8')
  normalize()

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(`${WEB}/atolye`, { waitUntil: 'networkidle' })
    await page.reload({ waitUntil: 'networkidle' })

    const card = page.getByRole('button', { name: new RegExp(MOTIF_NAME, 'i') }).first()
    const visible = await card
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false)

    let pressed = false
    let engraved = false
    if (visible) {
      await card.click()
      await page.waitForTimeout(400)
      pressed = (await card.getAttribute('aria-pressed')) === 'true'
      engraved = (await page.locator('aside svg .mh-tribe').count()) > 0
    }

    result = {
      passed: visible && pressed && engraved,
      detail: `kart belirdi=${visible} · seçildi=${pressed} · mühre işlendi=${engraved}`,
    }
  } finally {
    await browser.close()
  }
} finally {
  rmSync(SVG_PATH, { force: true })
  writeFileSync(CONTENT_PATH, contentBefore, 'utf8')
  normalize()
}

console.log(`T10 ${result.passed ? 'GEÇTİ' : 'KALDI'}  Yeni SVG arayüzde belirir  ${result.detail}`)
process.exit(result.passed ? 0 : 1)
