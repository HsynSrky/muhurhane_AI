/**
 * Mühür geometrisi (docs/PRD-tamamlayici.md §6).
 *
 * Tuval 1000x1000, merkez (500,500). Üç motif slotu iç içe ama birbirine
 * değmeyen halkalarda durur; AC-03'ün "üç motif görsel olarak ayrı bölgelerde
 * okunabilir" şartı bu bölge planından gelir.
 *
 * Yarıçaplar dıştan içe:
 *   492  ince kenar çizgisi
 *   484  kalın dış halka
 *   474  kuşağın dış sınırı
 *   436  kuşak öğelerinin merkez yörüngesi (öğe yarıçapı 36 → 400..472)
 *   398  kuşağın iç sınırı
 *   390  çift kural çizgisi
 *   344  yay metinlerinin taban yarıçapı
 *   306  iç alan sınırı
 *   merkez arma (500,424) r=172 · alt kartuş (500,690) r=54
 */

export const CANVAS = 1000
export const CX = 500
export const CY = 500

export const EDGE_HAIRLINE_RADIUS = 492
export const OUTER_RADIUS = 484
export const BAND_OUTER_RADIUS = 474
export const BAND_RADIUS = 436
export const BAND_ELEMENT_RADIUS = 36
export const BAND_INNER_RADIUS = 398
export const BAND_RULE_RADIUS = 390

export const ARC_RADIUS = 344
export const INNER_RADIUS = 306

export const SYMBOL_CX = 500
export const SYMBOL_CY = 424
export const SYMBOL_RADIUS = 172

export const TRIBE_CX = 500
export const TRIBE_CY = 690
export const TRIBE_RADIUS = 48

/** Yay metinlerini ayıran rozetlerin açıları: sağ ve sol. */
export const DIVIDER_ANGLES = [0, 180] as const

/**
 * Çizgi kalınlığı çarpanları.
 *
 * Motifler kendi sınır kutularına göre ölçeklendiği için çizgi kalınlığı hedef
 * kutuyla zaten orantılı çıkıyor. Tek istisna kuşak: 72 px'lik öğelerde ham
 * kalınlık 1 px'in altına düşüp görünmez oluyor, bu yüzden yükseltiliyor.
 */
export const STROKE_BOOST = {
  frame: 3.2,
  symbol: 1,
  tribe: 1,
} as const

const DEG = Math.PI / 180

export interface Point {
  x: number
  y: number
}

/** Kutupsal koordinat. 0° doğu, 90° güney (SVG'de y aşağı doğru artar). */
export function polar(radius: number, degrees: number, cx = CX, cy = CY): Point {
  return {
    x: cx + radius * Math.cos(degrees * DEG),
    y: cy + radius * Math.sin(degrees * DEG),
  }
}

/**
 * Bir motifi kaynak kutusundan hedef kareye oturtan dönüşüm.
 *
 * En uzun kenar hedef kareyi doldurur, en-boy oranı korunur, motif hedefin
 * merkezine hizalanır.
 */
export function fitTransform(
  bbox: readonly [number, number, number, number],
  centreX: number,
  centreY: number,
  radius: number,
): string {
  const [x, y, width, height] = bbox
  const longest = Math.max(width, height) || 1
  const scale = (radius * 2) / longest

  return (
    `translate(${round(centreX)} ${round(centreY)}) ` +
    `scale(${round(scale, 4)}) ` +
    `translate(${round(-(x + width / 2))} ${round(-(y + height / 2))})`
  )
}

export interface BandSlot {
  angle: number
  /** Öğeyi kuşak yörüngesine taşıyan ve dışa baktıran dönüşüm. */
  transform: string
}

/** Kuşaktaki tekrar öğelerinin açıları ve dönüşümleri. */
export function bandSlots(count: number): BandSlot[] {
  const safeCount = Math.max(1, Math.round(count))
  const step = 360 / safeCount

  return Array.from({ length: safeCount }, (_, index) => {
    const angle = index * step
    return {
      angle,
      transform: `rotate(${round(angle, 3)} ${CX} ${CY})`,
    }
  })
}

/** İki kuşak öğesi arasına düşen açılar; ince vurgu işaretleri buraya gider. */
export function bandGapAngles(count: number): number[] {
  const safeCount = Math.max(1, Math.round(count))
  const step = 360 / safeCount
  return Array.from({ length: safeCount }, (_, index) => index * step + step / 2)
}

export interface ArcGlyph {
  char: string
  x: number
  y: number
  rotation: number
}

export interface ArcLayout {
  glyphs: ArcGlyph[]
  fontSize: number
  /** Yayın kapladığı toplam açı; ayraç yerleşimini denetlemek için. */
  span: number
}

export interface ArcOptions {
  /** Yayın merkez açısı: üst yay için -90, alt yay için 90. */
  centreAngle: number
  /** Harflerin ilerleme yönü. Orhun sağdan sola yazılır. */
  direction: 'ltr' | 'rtl'
  radius?: number
  fontSize?: number
  /** Harf genişliğine göre açısal adım çarpanı. */
  tracking?: number
  /** Yayın kaplayabileceği en geniş açı. */
  maxSpan?: number
}

/**
 * Yay üzerine harf yerleştirir.
 *
 * Harfler sabit açısal adımla dizilir; her harf kendi `<text>` öğesidir ve
 * teğete oturacak şekilde döndürülür. Böylece font metriklerine bağımlılık ve
 * çift yönlü metin (bidi) yeniden sıralaması tamamen devre dışı kalır: mühür
 * hangi tarayıcıda açılırsa açılsın aynı görünür, PNG'ye de aynı geçer.
 */
export function layoutArcText(text: string, options: ArcOptions): ArcLayout {
  const {
    centreAngle,
    direction,
    radius = ARC_RADIUS,
    fontSize = 42,
    tracking = 1.06,
    maxSpan = 150,
  } = options

  const chars = [...text]
  if (chars.length === 0) return { glyphs: [], fontSize, span: 0 }

  const circumference = 2 * Math.PI * radius
  const naturalStep = ((fontSize * tracking) / circumference) * 360
  const step = Math.min(naturalStep, maxSpan / chars.length)
  // Adım daralırsa harfler de küçülmeli, yoksa üst üste binerler.
  const scaledFontSize = fontSize * Math.min(1, step / naturalStep)

  const span = step * (chars.length - 1)
  // Üst yayda açı büyüdükçe sağa, alt yayda sola gidilir. Okuma yönü bu yüzden
  // yayın konumuna bağlı: alt yay artan açıyla zaten sağdan sola akar.
  const clockwise = centreAngle < 0 ? 1 : -1
  const sign = direction === 'ltr' ? clockwise : -clockwise
  const start = centreAngle - (sign * span) / 2

  const glyphs = chars.map((char, index) => {
    const angle = start + sign * index * step
    const point = polar(radius, angle)
    // Üst yayda harflerin tepesi dışa bakar, alt yayda içe: ikisi de okunur kalır.
    const rotation = centreAngle < 0 ? angle + 90 : angle - 90
    return {
      char,
      x: round(point.x, 2),
      y: round(point.y, 2),
      rotation: round(rotation, 3),
    }
  })

  return { glyphs, fontSize: round(scaledFontSize, 2), span: round(span, 2) }
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
