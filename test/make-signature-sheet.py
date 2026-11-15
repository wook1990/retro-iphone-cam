#!/usr/bin/env python3
"""Phone-size 6-model × 3-scene signature sheet."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "samples"
SCENES = [
    ("backlit", "역광 · 낮, 해가 들어온 장면"),
    ("indoor", "실내 · 따뜻한 조명"),
    ("dusk", "해질녘 · 푸른 하늘과 조명"),
]
MODELS = [("5s", "5s"), ("se", "SE"), ("6s", "6s"), ("7", "7"), ("8", "8"), ("xs", "XS")]
TW, TH = 360, 270
PAD, LEFT, TOP, GAP_Y, LABEL_H, HEAD = 24, 40, 150, 70, 28, 36
W = LEFT + 6 * (TW + 12) - 12 + 40
H = TOP + 3 * (TH + LABEL_H + GAP_Y) - GAP_Y + 90
BG, FG, MUTED = (14, 14, 16), (243, 239, 232), (154, 149, 140)

def font(name, size):
    path = Path("/usr/share/fonts/truetype/sand-box/google") / name
    return ImageFont.truetype(str(path), size)

def fit(im, w, h):
    return im.convert("RGB").resize((w, h), Image.Resampling.LANCZOS)

def main():
    sheet = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(sheet)
    title = font("Gothic A1/GothicA1-Bold.ttf", 44)
    sub = font("Gothic A1/GothicA1-Regular.ttf", 18)
    section = font("Gothic A1/GothicA1-Medium.ttf", 20)
    label = font("Gothic A1/GothicA1-Regular.ttf", 16)
    foot = font("Gothic A1/GothicA1-Regular.ttf", 12)
    d.text((LEFT, 28), "그때 아이폰 · 기종별 느낌", font=title, fill=FG)
    d.text((LEFT, 82), "같은 사진을 휴대폰 화면 크기로 나란히 둔 모습. 확대하지 않았습니다.", font=sub, fill=MUTED)
    for r, (sid, stitle) in enumerate(SCENES):
        y0 = TOP + r * (TH + LABEL_H + GAP_Y)
        d.text((LEFT, y0 - 32), stitle, font=section, fill=MUTED)
        for c, (mid, name) in enumerate(MODELS):
            x = LEFT + c * (TW + 12)
            im = Image.open(SAMPLES / f"scene-{sid}-{mid}.jpg")
            sheet.paste(fit(im, TW, TH), (x, y0))
            d.text((x, y0 + TH + 6), name, font=label, fill=MUTED)
    d.text(
        (LEFT, H - 48),
        "역광: Basile Morin, Mekong contre-jour, CC BY-SA 4.0  ·  실내: Andy Li, French Coffee Shop Dieppe, CC0  ·  해질녘: Rhododendrites, Lincoln Center at dusk, CC BY-SA 4.0",
        font=foot, fill=MUTED,
    )
    d.text((LEFT, H - 30), "필터를 입힌 결과도 원본과 같은 라이선스입니다.", font=foot, fill=MUTED)
    out = SAMPLES / "signature-scenes.jpg"
    sheet.save(out, quality=90, subsampling=0, optimize=True)
    print("wrote", out, sheet.size)

if __name__ == "__main__":
    main()
