"""Motif normalizasyonu: ham SVG'leri mühür kompozisyonuna hazır hale getirir.

Ham dosyalar (``assets/selcuklu/*.svg``) tek başına görüntülenmek üzere çizilmiş:
her biri kendi kılavuz çemberini taşıyor, renkleri gövdeye gömülü ve stiller
``<defs><style>`` bloğunda. Üç motifi tek mühürde birleştirebilmek için hepsinin
sökülmesi gerekiyor.

Bu script derleme zamanında bir kez çalışır ve ``backend/data/motifs.generated.json``
üretir. Çalışma anında SVG parse edilmez.

Kullanım:
    python backend/scripts/normalize_motifs.py
"""

from __future__ import annotations

import json
import math
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

SVG_NS = "http://www.w3.org/2000/svg"
ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "assets" / "selcuklu"
CONTENT_FILE = ROOT / "backend" / "data" / "motif_content.json"
OUTPUT_FILE = ROOT / "backend" / "data" / "motifs.generated.json"

# Kompozisyonda anlamı olan sunum özellikleri. Geri kalanı atılır.
INHERITED_PROPS = (
    "fill",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-dasharray",
    "opacity",
)

DEFAULT_STYLE = {
    "fill": "#000000",
    "stroke": "none",
    "stroke-width": "1",
    "stroke-linecap": "butt",
    "stroke-linejoin": "miter",
}

# Kılavuz geometrisi: motifin kendi çerçevesi, mühürde kaldırılmalı.
# Merkezi (200,200) olan ve bu yarıçapa eşit/büyük çemberler kılavuz sayılır.
GUIDE_CIRCLE_MIN_RADIUS = 150

# Dairesel olmayan kaideler dosya bazında elenir (bkz. PRD-tamamlayici.md A-3, A-4).
GUIDE_OVERRIDES: dict[str, dict[str, object]] = {
    # Kubadabad çinisinin sekiz köşeli yıldız kaidesi.
    "1.4": {"drop_path_prefixes": ["M200 20"]},
    # Hayat Ağacı'nın dikdörtgen çerçevesi.
    "3.3": {"drop_full_bleed_rects": True},
}


# --------------------------------------------------------------------------- #
# Afin dönüşüm
# --------------------------------------------------------------------------- #

Matrix = tuple[float, float, float, float, float, float]  # a b c d e f
IDENTITY: Matrix = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)

_TRANSFORM_RE = re.compile(r"(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)")
_NUMBER_RE = re.compile(r"[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?")


def _numbers(text: str) -> list[float]:
    return [float(match.group()) for match in _NUMBER_RE.finditer(text)]


def multiply(m1: Matrix, m2: Matrix) -> Matrix:
    a1, b1, c1, d1, e1, f1 = m1
    a2, b2, c2, d2, e2, f2 = m2
    return (
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    )


def parse_transform(value: str | None) -> Matrix:
    if not value:
        return IDENTITY
    result = IDENTITY
    for match in _TRANSFORM_RE.finditer(value):
        kind, raw = match.group(1), match.group(2)
        args = _numbers(raw)
        if kind == "matrix" and len(args) == 6:
            current: Matrix = (args[0], args[1], args[2], args[3], args[4], args[5])
        elif kind == "translate":
            tx = args[0] if args else 0.0
            ty = args[1] if len(args) > 1 else 0.0
            current = (1.0, 0.0, 0.0, 1.0, tx, ty)
        elif kind == "scale":
            sx = args[0] if args else 1.0
            sy = args[1] if len(args) > 1 else sx
            current = (sx, 0.0, 0.0, sy, 0.0, 0.0)
        elif kind == "rotate":
            angle = math.radians(args[0] if args else 0.0)
            cos_a, sin_a = math.cos(angle), math.sin(angle)
            rotation: Matrix = (cos_a, sin_a, -sin_a, cos_a, 0.0, 0.0)
            if len(args) >= 3:
                cx, cy = args[1], args[2]
                current = multiply(
                    multiply((1.0, 0.0, 0.0, 1.0, cx, cy), rotation),
                    (1.0, 0.0, 0.0, 1.0, -cx, -cy),
                )
            else:
                current = rotation
        elif kind == "skewX":
            current = (1.0, 0.0, math.tan(math.radians(args[0])), 1.0, 0.0, 0.0)
        elif kind == "skewY":
            current = (1.0, math.tan(math.radians(args[0])), 0.0, 1.0, 0.0, 0.0)
        else:
            continue
        result = multiply(result, current)
    return result


def apply(matrix: Matrix, x: float, y: float) -> tuple[float, float]:
    a, b, c, d, e, f = matrix
    return (a * x + c * y + e, b * x + d * y + f)


# --------------------------------------------------------------------------- #
# Geometri örnekleme (sınır kutusu için)
# --------------------------------------------------------------------------- #

_PATH_TOKEN_RE = re.compile(r"([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)")


def path_points(d: str) -> list[tuple[float, float]]:
    """Path verisinden nokta bulutu çıkarır.

    Bézier kontrol noktaları da dahil edilir. Eğri kendi kontrol noktalarının
    dışbükey kabuğu içinde kaldığı için sonuç gerçek sınırın üst kümesidir;
    motif hiçbir zaman kutusundan taşmaz.
    """
    tokens: list[str | float] = []
    for match in _PATH_TOKEN_RE.finditer(d):
        if match.group(1):
            tokens.append(match.group(1))
        else:
            tokens.append(float(match.group(2)))

    points: list[tuple[float, float]] = []
    index = 0
    command = ""
    current = (0.0, 0.0)
    start = (0.0, 0.0)

    def take(count: int) -> list[float]:
        nonlocal index
        values = [v for v in tokens[index : index + count] if isinstance(v, float)]
        index += count
        return values

    while index < len(tokens):
        token = tokens[index]
        if isinstance(token, str):
            command = token
            index += 1
            if command in "Zz":
                current = start
                continue
        elif not command:
            index += 1
            continue

        relative = command.islower()
        code = command.upper()

        if code in ("M", "L", "T"):
            args = take(2)
            if len(args) < 2:
                break
            x, y = args
            current = (current[0] + x, current[1] + y) if relative else (x, y)
            if code == "M":
                start = current
                command = "l" if relative else "L"
            points.append(current)
        elif code == "H":
            args = take(1)
            if not args:
                break
            current = (current[0] + args[0], current[1]) if relative else (args[0], current[1])
            points.append(current)
        elif code == "V":
            args = take(1)
            if not args:
                break
            current = (current[0], current[1] + args[0]) if relative else (current[0], args[0])
            points.append(current)
        elif code in ("C", "S", "Q", "A"):
            count = {"C": 6, "S": 4, "Q": 4, "A": 7}[code]
            args = take(count)
            if len(args) < count:
                break
            if code == "A":
                pairs = [(args[5], args[6])]
            else:
                pairs = [(args[i], args[i + 1]) for i in range(0, count, 2)]
            for px, py in pairs:
                point = (current[0] + px, current[1] + py) if relative else (px, py)
                points.append(point)
            current = points[-1]
        else:
            index += 1

    return points


def shape_points(tag: str, attrib: dict[str, str]) -> list[tuple[float, float]]:
    def num(key: str, default: float = 0.0) -> float:
        try:
            return float(attrib.get(key, default))
        except (TypeError, ValueError):
            return default

    if tag == "circle":
        cx, cy, r = num("cx"), num("cy"), num("r")
        return [(cx - r, cy - r), (cx + r, cy - r), (cx + r, cy + r), (cx - r, cy + r)]
    if tag == "ellipse":
        cx, cy, rx, ry = num("cx"), num("cy"), num("rx"), num("ry")
        return [(cx - rx, cy - ry), (cx + rx, cy - ry), (cx + rx, cy + ry), (cx - rx, cy + ry)]
    if tag == "rect":
        x, y, w, h = num("x"), num("y"), num("width"), num("height")
        return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    if tag == "line":
        return [(num("x1"), num("y1")), (num("x2"), num("y2"))]
    if tag in ("polyline", "polygon"):
        values = _numbers(attrib.get("points", ""))
        return [(values[i], values[i + 1]) for i in range(0, len(values) - 1, 2)]
    if tag == "path":
        return path_points(attrib.get("d", ""))
    return []


# --------------------------------------------------------------------------- #
# Ayrıştırma
# --------------------------------------------------------------------------- #


@dataclass
class Shape:
    tag: str
    attrib: dict[str, str]
    style: dict[str, str]
    matrix: Matrix
    points: list[tuple[float, float]] = field(default_factory=list)


def parse_css(root: ET.Element) -> dict[str, dict[str, str]]:
    """``<defs><style>`` içindeki sınıf kurallarını sözlüğe çevirir."""
    rules: dict[str, dict[str, str]] = {}
    for style_element in root.iter(f"{{{SVG_NS}}}style"):
        css = style_element.text or ""
        for selector, body in re.findall(r"\.([\w-]+)\s*\{([^}]*)\}", css):
            declarations: dict[str, str] = {}
            for declaration in body.split(";"):
                if ":" not in declaration:
                    continue
                prop, _, value = declaration.partition(":")
                prop, value = prop.strip(), value.strip()
                if prop in INHERITED_PROPS:
                    declarations[prop] = value
            rules.setdefault(selector, {}).update(declarations)
    return rules


def resolve_style(
    element: ET.Element,
    inherited: dict[str, str],
    explicit_ancestors: dict[str, str],
    css_rules: dict[str, dict[str, str]],
) -> tuple[dict[str, str], dict[str, str]]:
    """Bir öğenin efektif stilini ve alt öğelere geçecek açık öznitelikleri hesaplar.

    Öncelik sırası: miras < sınıf kuralı < atadaki açık öznitelik < kendi açık özniteliği.

    Not: SVG spesifikasyonunda CSS sınıf kuralı sunum özniteliğini geçersiz kılar,
    yani burada bilinçli olarak tersi uygulanıyor (bkz. PRD-tamamlayici.md A-6/A-7).
    Ham dosyalardaki ``stroke-width`` değerleri ve grup düzeyindeki ``stroke``
    geçersiz kılmaları sanatçının kurduğu çizgi hiyerarşisini ve renk katmanlarını
    taşıyor; spesifikasyon sırası uygulanırsa ikisi de tamamen kayboluyor.
    """
    style = dict(inherited)
    for class_name in (element.get("class") or "").split():
        style.update(css_rules.get(class_name, {}))

    own_explicit = {
        prop: value.strip()
        for prop in INHERITED_PROPS
        if (value := element.get(prop)) is not None
    }
    explicit = {**explicit_ancestors, **own_explicit}
    style.update(explicit)
    return style, explicit


def should_drop(motif_id: str, tag: str, attrib: dict[str, str]) -> bool:
    overrides = GUIDE_OVERRIDES.get(motif_id, {})

    if tag == "circle":
        try:
            cx, cy, r = float(attrib["cx"]), float(attrib["cy"]), float(attrib["r"])
        except (KeyError, ValueError):
            return False
        centred = abs(cx - 200) < 1 and abs(cy - 200) < 1
        return centred and r >= GUIDE_CIRCLE_MIN_RADIUS

    if tag == "rect" and overrides.get("drop_full_bleed_rects"):
        try:
            width, height = float(attrib["width"]), float(attrib["height"])
        except (KeyError, ValueError):
            return False
        return width >= 300 and height >= 300

    if tag == "path":
        d = (attrib.get("d") or "").strip()
        for prefix in overrides.get("drop_path_prefixes", []):  # type: ignore[union-attr]
            if d.startswith(prefix):
                return True

    return False


def collect_shapes(
    element: ET.Element,
    motif_id: str,
    css_rules: dict[str, dict[str, str]],
    inherited_style: dict[str, str],
    explicit_ancestors: dict[str, str],
    inherited_matrix: Matrix,
    out: list[Shape],
) -> None:
    for child in element:
        tag = child.tag.split("}")[-1]
        if tag in ("defs", "style", "title", "desc", "metadata"):
            continue

        style, explicit = resolve_style(child, inherited_style, explicit_ancestors, css_rules)
        matrix = multiply(inherited_matrix, parse_transform(child.get("transform")))

        if tag == "g":
            collect_shapes(child, motif_id, css_rules, style, explicit, matrix, out)
            continue

        attrib = {k: v for k, v in child.attrib.items() if "}" not in k}
        if should_drop(motif_id, tag, attrib):
            continue

        raw_points = shape_points(tag, attrib)
        if not raw_points:
            continue

        out.append(
            Shape(
                tag=tag,
                attrib=attrib,
                style=style,
                matrix=matrix,
                points=[apply(matrix, x, y) for x, y in raw_points],
            )
        )


# --------------------------------------------------------------------------- #
# Renk katmanlama
# --------------------------------------------------------------------------- #


def normalize_colour(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip().lower()
    if value in ("none", "transparent", "currentcolor", ""):
        return None
    if value.startswith("#") and len(value) == 4:
        return "#" + "".join(c * 2 for c in value[1:])
    return value


def build_colour_tiers(shapes: list[Shape]) -> dict[str, int]:
    """Gömülü renkleri kullanım sıklığına göre ink/mid/accent katmanlarına eşler."""
    usage: Counter[str] = Counter()
    order: list[str] = []
    for shape in shapes:
        for prop in ("stroke", "fill"):
            colour = normalize_colour(shape.style.get(prop))
            if colour is None:
                continue
            if colour not in usage:
                order.append(colour)
            usage[colour] += 1

    ranked = sorted(order, key=lambda c: (-usage[c], order.index(c)))
    return {colour: min(index, 2) for index, colour in enumerate(ranked)}


# --------------------------------------------------------------------------- #
# Çıktı üretimi
# --------------------------------------------------------------------------- #

GEOMETRY_ATTRS = {
    "circle": ("cx", "cy", "r"),
    "ellipse": ("cx", "cy", "rx", "ry"),
    "rect": ("x", "y", "width", "height", "rx", "ry"),
    "line": ("x1", "y1", "x2", "y2"),
    "polyline": ("points",),
    "polygon": ("points",),
    "path": ("d",),
}


def compact_number(value: float) -> str:
    text = f"{value:.2f}".rstrip("0").rstrip(".")
    return text or "0"


def clean_path_data(d: str) -> str:
    return re.sub(r"\s+", " ", d).strip()


def render_shape(shape: Shape, tiers: dict[str, int]) -> str | None:
    stroke = normalize_colour(shape.style.get("stroke"))
    fill = normalize_colour(shape.style.get("fill"))
    if stroke is None and fill is None:
        return None

    classes: list[str] = []
    parts: list[str] = []

    for name in GEOMETRY_ATTRS.get(shape.tag, ()):
        value = shape.attrib.get(name)
        if value is None:
            continue
        if name == "d":
            value = clean_path_data(value)
        parts.append(f'{name}="{value}"')

    if shape.tag == "path" and not any(p.startswith('d="') for p in parts):
        return None

    if stroke is not None:
        classes.append(f"s{tiers[stroke]}")
        try:
            width = float(shape.style.get("stroke-width", "1"))
        except ValueError:
            width = 1.0
        parts.append(f'stroke-width="{compact_number(width)}"')
        linecap = shape.style.get("stroke-linecap")
        if linecap and linecap != DEFAULT_STYLE["stroke-linecap"]:
            parts.append(f'stroke-linecap="{linecap}"')
        linejoin = shape.style.get("stroke-linejoin")
        if linejoin and linejoin != DEFAULT_STYLE["stroke-linejoin"]:
            parts.append(f'stroke-linejoin="{linejoin}"')
        dash = shape.style.get("stroke-dasharray")
        if dash and dash != "none":
            parts.append(f'stroke-dasharray="{dash}"')
    else:
        classes.append("sn")

    classes.append(f"f{tiers[fill]}" if fill is not None else "fn")

    transform = shape.attrib.get("transform")
    if transform:
        parts.append(f'transform="{transform}"')

    attributes = " ".join([f'class="{" ".join(classes)}"', *parts])
    return f"<{shape.tag} {attributes}/>"


def slugify(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.replace("ı", "i").replace("İ", "i"))
    ascii_text = decomposed.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")


def normalize_motif(path: Path, content: dict[str, dict]) -> dict:
    motif_id = path.stem.split("_", 1)[0]
    meta = content["motifs"].get(motif_id)
    if meta is None:
        raise SystemExit(f"İçerik kaydı eksik: {motif_id} ({path.name})")

    root = ET.parse(path).getroot()
    css_rules = parse_css(root)

    shapes: list[Shape] = []
    base_style = dict(DEFAULT_STYLE)
    collect_shapes(root, motif_id, css_rules, base_style, {}, IDENTITY, shapes)
    if not shapes:
        raise SystemExit(f"Kılavuz temizliğinden sonra hiç şekil kalmadı: {path.name}")

    tiers = build_colour_tiers(shapes)

    xs = [x for shape in shapes for x, _ in shape.points]
    ys = [y for shape in shapes for _, y in shape.points]
    stroke_pad = max(
        (float(shape.style.get("stroke-width", 1)) for shape in shapes if normalize_colour(shape.style.get("stroke"))),
        default=0.0,
    ) / 2
    min_x, max_x = min(xs) - stroke_pad, max(xs) + stroke_pad
    min_y, max_y = min(ys) - stroke_pad, max(ys) + stroke_pad

    body = "".join(filter(None, (render_shape(shape, tiers) for shape in shapes)))

    return {
        "id": motif_id,
        "slug": slugify(meta["name"]),
        "slot": meta["slot"],
        "name": meta["name"],
        "period": content["period"],
        "blurb": meta["blurb"],
        "history": meta["history"],
        "repeat": meta.get("repeat"),
        "citations": list(meta.get("citations") or []),
        "source": f"assets/selcuklu/{path.name}",
        "bbox": [
            round(min_x, 2),
            round(min_y, 2),
            round(max_x - min_x, 2),
            round(max_y - min_y, 2),
        ],
        "tierCount": len(set(tiers.values())) if tiers else 0,
        "shapeCount": len(shapes),
        "body": body,
    }


def main() -> int:
    if not SOURCE_DIR.is_dir():
        raise SystemExit(f"Kaynak klasör bulunamadı: {SOURCE_DIR}")

    content = json.loads(CONTENT_FILE.read_text(encoding="utf-8"))
    sources = sorted(SOURCE_DIR.glob("*.svg"))
    if not sources:
        raise SystemExit(f"{SOURCE_DIR} içinde SVG yok")

    motifs = [normalize_motif(path, content) for path in sources]
    slot_order = {"frame": 0, "symbol": 1, "tribe": 2}
    motifs.sort(key=lambda m: (slot_order.get(m["slot"], 9), m["id"]))

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "generator": "backend/scripts/normalize_motifs.py",
        "viewBox": [0, 0, 400, 400],
        "period": content["period"],
        "motifs": motifs,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )

    print(f"{len(motifs)} motif normalize edildi -> {OUTPUT_FILE.relative_to(ROOT)}")
    for motif in motifs:
        x, y, w, h = motif["bbox"]
        print(
            f"  {motif['id']:<4} {motif['slot']:<7} {motif['name']:<24} "
            f"bbox=({x:>6.1f},{y:>6.1f},{w:>6.1f},{h:>6.1f}) "
            f"şekil={motif['shapeCount']:>2} katman={motif['tierCount']}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
