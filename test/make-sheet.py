#!/usr/bin/env python3
"""Compose samples/contact-sheet.jpg in the established v1.1 layout."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "samples"
W, H = 3076, 3722
BG = (14, 14, 16)
FG = (243, 239, 232)
MUTED = (154, 149, 140)
SKY = (1890, 0, 420, 410)
SHADOW = (690, 1790, 420, 420)
LOOKS = [
    ("원본", None, "원본"),
    ("5s", "5s", "5s · 2013 · 8MP"),
    ("SE", "se", "SE · 2016 · 12MP"),
    ("6s", "6s", "6s · 2015 · 12MP"),
    ("7", "7", "7 · 2016 · 12MP"),
    ("8", "8", "8 · 2017 · 12MP"),
    ("XS", "xs", "XS · 2018 · 12MP"),
]

def font(name, size):
    path = Path("/usr/share/fonts/truetype/sand-box/google") / name
    return ImageFont.truetype(str(path), size)

TITLE = font("Gothic A1/GothicA1-Bold.ttf", 54)
SUB = font("Gothic A1/GothicA1-Regular.ttf", 22)
LABEL = font("Gothic A1/GothicA1-Regular.ttf", 18)
SECTION = font("Gothic A1/GothicA1-Medium.ttf", 20)
FOOT = font("Gothic A1/GothicA1-Regular.ttf", 13)

def load(name):
    return Image.open(SAMPLES / name).convert("RGB")

def crop100(im, box):
    x, y, w, h = box
    sx = im.width / 4032
    sy = im.height / 3024
    x, y, w, h = int(round(x * sx)), int(round(y * sy)), int(round(w * sx)), int(round(h * sy))
    x = min(max(0, x), max(0, im.width - w))
    y = min(max(0, y), max(0, im.height - h))
    return im.crop((x, y, x + w, y + h)).resize((box[2], box[3]), Image.Resampling.LANCZOS)

def fit(im, w, h):
    return im.resize((w, h), Image.Resampling.LANCZOS)

def main():
    sheet = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(sheet)
    d.text((56, 44), "그때 아이폰", font=TITLE, fill=FG)
    d.text((56, 114), "색만이 아니라, 그때 카메라의 노이즈와 해상력까지 담았어요.", font=SUB, fill=MUTED)

    originals = {
        None: load("original.jpg"),
        "5s": load("5s.jpg"),
        "se": load("se.jpg"),
        "6s": load("6s.jpg"),
        "7": load("7.jpg"),
        "8": load("8.jpg"),
        "xs": load("xs.jpg"),
    }
    dims = {
        None: load("original-dim.jpg") if (SAMPLES / "original-dim.jpg").exists() else load("lowlight-orig.jpg") if (SAMPLES / "lowlight-orig.jpg").exists() else None,
        "5s": load("lowlight-5s.jpg"),
        "se": load("lowlight-se.jpg"),
        "6s": load("lowlight-6s.jpg"),
        "7": load("lowlight-7.jpg"),
        "8": load("lowlight-8.jpg"),
        "xs": load("lowlight-xs.jpg"),
    }

    # overview row 1 + 2
    positions = [
        (56, 170), (804, 170), (1552, 170), (2300, 170),
        (430, 770), (1178, 770), (1926, 770),
    ]
    for (x, y), (short, key, label) in zip(positions, LOOKS):
        sheet.paste(fit(originals[key], 720, 540), (x, y))
        d.text((x, y + 548), label, font=LABEL, fill=MUTED)

    def row7(y, title, getter, box, h, labels):
        d.text((44, y - 40), title, font=SECTION, fill=MUTED)
        xs = [44 + i * 428 for i in range(7)]
        for x, (short, key, _) in zip(xs, LOOKS):
            im = getter(key)
            tile = crop100(im, box) if box else fit(im, 360, 270)
            if tile.size != (tile.size[0], h) and box:
                tile = tile.resize((box[2], h), Image.Resampling.LANCZOS)
            sheet.paste(tile, (x, y))
            d.text((x, y + h + 8), labels[key], font=LABEL, fill=MUTED)
        return xs

    small_labels = {None: "원본", "5s": "5s", "se": "SE", "6s": "6s", "7": "7", "8": "8", "xs": "XS"}
    row7(1436, "100% 확대 · 하늘 (노이즈와 해상력)", lambda k: originals[k], SKY, 410, small_labels)
    row7(1938, "100% 확대 · 그림자 (노이즈와 윤곽선)", lambda k: originals[k], SHADOW, 420, small_labels)

    # phone-width row, centered 360x270
    d.text((44, 2410), "휴대폰 화면 크기 · 확대하지 않은 상태", font=SECTION, fill=MUTED)
    for i, (short, key, _) in enumerate(LOOKS):
        x = 254 + i * 368
        sheet.paste(fit(originals[key], 360, 270), (x, 2450))
        d.text((x, 2728), small_labels[key], font=LABEL, fill=MUTED)

    if dims[None] is None:
        raise SystemExit("missing dim original")

    d.text((44, 2772), "어두운 장면 · 같은 사진, 노출만 낮춤", font=SECTION, fill=MUTED)
    for i, (short, key, _) in enumerate(LOOKS):
        x = 254 + i * 368
        sheet.paste(fit(dims[key], 360, 270), (x, 2812))
        d.text((x, 3090), small_labels[key], font=LABEL, fill=MUTED)

    row7(3174, "어두운 장면 100% 확대 · 그림자", lambda k: dims[k], SHADOW, 420, small_labels)

    d.text(
        (56, 3672),
        "원본 사진: James Ó Nuanáin, Inverness Street Market from Camden High Street 2020, CC BY-SA 2.0",
        font=FOOT,
        fill=MUTED,
    )
    d.text(
        (56, 3692),
        "필터를 입힌 결과도 같은 라이선스입니다. 100% 칸은 저장된 해상도에서 그대로 잘라 붙입니다.",
        font=FOOT,
        fill=MUTED,
    )
    out = SAMPLES / "contact-sheet.jpg"
    sheet.save(out, quality=88, subsampling=0, optimize=True)
    print("wrote", out, "size", out.stat().st_size)

if __name__ == "__main__":
    main()
