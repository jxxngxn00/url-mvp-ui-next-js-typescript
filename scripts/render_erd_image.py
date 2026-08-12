from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "images"
OUT_PATH = OUT_DIR / "erd_full.png"

SCALE = 2
WIDTH = 2400
HEIGHT = 1500


def scaled(value: int) -> int:
    return value * SCALE


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]

    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, scaled(size))

    return ImageFont.load_default()


TITLE_FONT = font(42, True)
SUBTITLE_FONT = font(22)
SECTION_FONT = font(22, True)
TABLE_TITLE_FONT = font(23, True)
ROW_FONT = font(21)
EDGE_FONT = font(16)
NOTE_TITLE_FONT = font(22, True)
NOTE_FONT = font(19)


def box_height(table: dict) -> int:
    return 48 + len(table["rows"]) * 34 + 18


def center(table: dict) -> tuple[int, int]:
    return table["x"] + table["w"] // 2, table["y"] + box_height(table) // 2


def get_table(tables: list[dict], table_id: str) -> dict:
    return next(table for table in tables if table["id"] == table_id)


def anchor(tables: list[dict], table_id: str, side: str) -> tuple[int, int]:
    table = get_table(tables, table_id)
    cx, cy = center(table)

    if side == "left":
        return table["x"], cy
    if side == "right":
        return table["x"] + table["w"], cy
    if side == "top":
        return cx, table["y"]
    if side == "bottom":
        return cx, table["y"] + box_height(table)

    return cx, cy


def draw_table(draw: ImageDraw.ImageDraw, table: dict) -> None:
    x = scaled(table["x"])
    y = scaled(table["y"])
    w = scaled(table["w"])
    h = scaled(box_height(table))
    radius = scaled(14)
    header_h = scaled(48)

    shadow = [x + scaled(10), y + scaled(18), x + w + scaled(10), y + h + scaled(18)]
    draw.rounded_rectangle(shadow, radius=radius, fill=(0, 0, 0, 76))
    draw.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill="#141b27", outline="#334155", width=scaled(2))
    draw.rounded_rectangle([x, y, x + w, y + header_h], radius=radius, fill=table["color"])
    draw.rectangle([x, y + scaled(30), x + w, y + header_h], fill=table["color"])
    draw.text((x + scaled(24), y + scaled(12)), table["id"], fill="#ffffff", font=TABLE_TITLE_FONT)

    for index, row in enumerate(table["rows"]):
        row_y = y + header_h + scaled(14 + index * 34)
        fill = "#e5f3ff" if index < 3 else "#9fb3c8"
        draw.text((x + scaled(24), row_y), row, fill=fill, font=ROW_FONT)


def draw_edge(
    draw: ImageDraw.ImageDraw,
    start: tuple[int, int],
    end: tuple[int, int],
    label: str,
    dy: int = 0,
) -> None:
    x1, y1 = start
    x2, y2 = end
    y1 += dy
    y2 += dy
    mid_x = (x1 + x2) // 2

    points = [
        (scaled(x1), scaled(y1)),
        (scaled(mid_x), scaled(y1)),
        (scaled(mid_x), scaled(y2)),
        (scaled(x2), scaled(y2)),
    ]
    draw.line(points, fill="#5b6b85", width=scaled(3), joint="curve")
    draw.ellipse(
        [
            scaled(x2) - scaled(6),
            scaled(y2) - scaled(6),
            scaled(x2) + scaled(6),
            scaled(y2) + scaled(6),
        ],
        fill="#38bdf8",
    )

    label_x = scaled((x1 + x2) // 2)
    label_y = scaled((y1 + y2) // 2 - 8)
    label_w = scaled(158)
    label_h = scaled(30)
    draw.rounded_rectangle(
        [label_x - label_w // 2, label_y - label_h, label_x + label_w // 2, label_y],
        radius=scaled(15),
        fill="#101827",
        outline="#334155",
        width=scaled(1),
    )
    bbox = draw.textbbox((0, 0), label, font=EDGE_FONT)
    text_w = bbox[2] - bbox[0]
    draw.text((label_x - text_w // 2, label_y - scaled(24)), label, fill="#cbd5e1", font=EDGE_FONT)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    image = Image.new("RGB", (scaled(WIDTH), scaled(HEIGHT)), "#0d1117")
    draw = ImageDraw.Draw(image, "RGBA")

    draw.ellipse([scaled(1720), scaled(-180), scaled(2360), scaled(460)], fill=(14, 165, 233, 20))
    draw.ellipse([scaled(1640), scaled(840), scaled(2480), scaled(1680)], fill=(147, 51, 234, 20))
    draw.text((scaled(90), scaled(55)), "PatchSignal ERD", fill="#f8fbff", font=TITLE_FONT)
    draw.text(
        (scaled(90), scaled(105)),
        "Public analysis tables + admin patch update workflow",
        fill="#9fb3c8",
        font=SUBTITLE_FONT,
    )

    draw.rounded_rectangle(
        [scaled(50), scaled(130), scaled(1690), scaled(885)],
        radius=scaled(26),
        outline="#26364f",
        width=scaled(3),
    )
    draw.text((scaled(80), scaled(142)), "Public Analysis Tables", fill="#dbeafe", font=SECTION_FONT)
    draw.rounded_rectangle(
        [scaled(50), scaled(915), scaled(1850), scaled(1435)],
        radius=scaled(26),
        outline="#3b2f5d",
        width=scaled(3),
    )
    draw.text((scaled(80), scaled(927)), "Admin Patch Update Workflow", fill="#ede9fe", font=SECTION_FONT)

    tables = [
        {"id": "HERO", "x": 90, "y": 170, "w": 360, "color": "#0ea5e9", "rows": ["PK id", "UK hero_id", "name_ko, name_en", "role, difficulty, image_url"]},
        {"id": "PATCH_NOTE", "x": 90, "y": 535, "w": 360, "color": "#2563eb", "rows": ["PK id", "UK patch_id", "title, patch_date, source_url", "raw_content, summaries"]},
        {"id": "HERO_CHANGE", "x": 650, "y": 345, "w": 420, "color": "#7c3aed", "rows": ["PK id", "UK change_id", "FK patch_note_id", "FK hero_id", "change_type, impact_level", "original_change, summaries"]},
        {"id": "AFFECTED_TIER", "x": 1280, "y": 155, "w": 360, "color": "#16a34a", "rows": ["PK id", "FK hero_change_id", "tier, reason"]},
        {"id": "HERO_SYNERGY", "x": 1280, "y": 400, "w": 360, "color": "#0891b2", "rows": ["PK id", "FK hero_change_id", "FK target_hero_id", "reason"]},
        {"id": "HERO_COUNTER", "x": 1280, "y": 665, "w": 360, "color": "#e11d48", "rows": ["PK id", "FK hero_change_id", "FK target_hero_id", "reason"]},
        {"id": "PATCH_IMPORT", "x": 90, "y": 990, "w": 400, "color": "#1d4ed8", "rows": ["PK id", "UK source_url", "UK content_hash", "raw_html, raw_text", "status, timestamps"]},
        {"id": "PATCH_CHANGE_STAGING", "x": 690, "y": 985, "w": 460, "color": "#9333ea", "rows": ["PK id", "FK patch_import_id", "FK hero_id", "FK applied_hero_change_id", "parsed_payload, confidence", "status, reviewer_note"]},
        {"id": "PATCH_STAGING_RELATION", "x": 1370, "y": 975, "w": 430, "color": "#db2777", "rows": ["PK id", "FK staging_change_id", "FK target_hero_id", "relation_type, value, reason"]},
        {"id": "PATCH_APPLY_LOG", "x": 1370, "y": 1240, "w": 430, "color": "#d97706", "rows": ["PK id", "FK patch_import_id", "FK staging_change_id", "action, status, metadata"]},
    ]

    edges = [
        ("HERO", "right", "HERO_CHANGE", "left", "1:N hero", -62),
        ("PATCH_NOTE", "right", "HERO_CHANGE", "left", "1:N patch", 60),
        ("HERO_CHANGE", "right", "AFFECTED_TIER", "left", "1:N tiers", -110),
        ("HERO_CHANGE", "right", "HERO_SYNERGY", "left", "1:N synergy", 0),
        ("HERO_CHANGE", "right", "HERO_COUNTER", "left", "1:N counters", 112),
        ("HERO", "right", "HERO_SYNERGY", "left", "target hero", 8),
        ("HERO", "right", "HERO_COUNTER", "left", "target hero", 92),
        ("PATCH_IMPORT", "right", "PATCH_CHANGE_STAGING", "left", "1:N stages", -38),
        ("PATCH_IMPORT", "right", "PATCH_APPLY_LOG", "left", "1:N logs", 96),
        ("PATCH_CHANGE_STAGING", "right", "PATCH_STAGING_RELATION", "left", "1:N relations", -55),
        ("PATCH_CHANGE_STAGING", "right", "PATCH_APPLY_LOG", "left", "1:N logs", 85),
        ("HERO_CHANGE", "bottom", "PATCH_CHANGE_STAGING", "top", "applied_from", 0),
        ("HERO", "right", "PATCH_CHANGE_STAGING", "left", "mapped hero", 145),
        ("HERO", "right", "PATCH_STAGING_RELATION", "left", "relation target", 215),
    ]

    for source, source_side, target, target_side, label, dy in edges:
        draw_edge(draw, anchor(tables, source, source_side), anchor(tables, target, target_side), label, dy)

    for table in tables:
        draw_table(draw, table)

    note_x = scaled(1880)
    draw.text((note_x, scaled(1015)), "Relationship Notes", fill="#dbeafe", font=NOTE_TITLE_FONT)
    notes = [
        "PATCH_NOTE -> HERO_CHANGE cascades",
        "HERO_CHANGE -> relation tables cascades",
        "PATCH_IMPORT -> staging cascades",
        "Apply logs preserve nullable references",
        "HERO deletion is restricted while referenced",
    ]
    for index, note in enumerate(notes):
        draw.text((note_x, scaled(1060 + index * 35)), note, fill="#9fb3c8", font=NOTE_FONT)

    image = image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    image.save(OUT_PATH)
    print(OUT_PATH)


if __name__ == "__main__":
    main()
