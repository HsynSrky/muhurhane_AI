/**
 * Mührün HD PNG'ye dönüştürülmesi.
 *
 * Kaynak, ekranda gösterilen SVG'nin ta kendisidir; sunucuya gidilmez. İndirme
 * bu yüzden anında tamamlanır ve çıktı önizlemeyle birebir aynıdır (S-2).
 *
 * Fontlar SVG'nin içine base64 olarak gömülür: `<img>` üzerinden rasterlenen
 * bir SVG dış kaynak yükleyemez, gömülmezse Orhun harfleri boş kutuya döner.
 */

import cormorantLatinExtUrl from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-ext-600-normal.woff2?url'
import cormorantLatinUrl from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2?url'
import orkhonUrl from '@fontsource/noto-sans-old-turkic/files/noto-sans-old-turkic-old-turkic-400-normal.woff2?url'

import { composeSeal, type SealComposition } from './compose'

export const EXPORT_SIZE = 3000

interface EmbeddedFont {
  family: string
  weight: number
  url: string
}

const FONTS: EmbeddedFont[] = [
  { family: 'Cormorant Garamond', weight: 600, url: cormorantLatinUrl },
  { family: 'Cormorant Garamond', weight: 600, url: cormorantLatinExtUrl },
  { family: 'Noto Sans Old Turkic', weight: 400, url: orkhonUrl },
]

let fontFacePromise: Promise<string> | null = null

async function toBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Font indirilemedi: ${url}`)
  const buffer = new Uint8Array(await response.arrayBuffer())

  let binary = ''
  const CHUNK = 0x8000
  for (let index = 0; index < buffer.length; index += CHUNK) {
    binary += String.fromCharCode(...buffer.subarray(index, index + CHUNK))
  }
  return btoa(binary)
}

/** `@font-face` bloğu bir kez kurulur ve oturum boyunca yeniden kullanılır. */
export function loadFontFaceCss(): Promise<string> {
  fontFacePromise ??= Promise.all(
    FONTS.map(async (font) => {
      const base64 = await toBase64(font.url)
      return (
        `@font-face{font-family:'${font.family}';font-style:normal;` +
        `font-weight:${font.weight};` +
        `src:url(data:font/woff2;base64,${base64}) format('woff2');}`
      )
    }),
  ).then((faces) => faces.join(''))

  return fontFacePromise
}

function svgToImage(svg: string): Promise<HTMLImageElement> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Mühür görüntüye dönüştürülemedi.'))
    }
    image.src = url
  })
}

/** Kompozisyonu belirtilen kenar uzunluğunda PNG'ye çevirir. */
export async function renderSealPng(
  composition: SealComposition,
  size: number = EXPORT_SIZE,
): Promise<Blob> {
  const fontFaceCss = await loadFontFaceCss()
  const svg = composeSeal({ ...composition, fontFaceCss, idSuffix: 'export' })
  const image = await svgToImage(svg)

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Tarayıcı 2D çizim bağlamı vermedi.')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, size, size)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('PNG kodlanamadı.')),
      'image/png',
    )
  })
}

/** Kaydedilecek dosya adı: `muhur-eren-bey.png`. */
export function buildFileName(latinName: string): string {
  const slug = latinName
    .trim()
    .replace(/I/g, 'ı')
    .replace(/İ/g, 'i')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')

  return slug ? `muhur-${slug}.png` : 'muhur-tdt-13-bulusma.png'
}

export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Chrome indirme akışını başlatana kadar URL'in yaşaması gerekiyor.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
