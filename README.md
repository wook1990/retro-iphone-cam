# 그때 아이폰

A web camera that gives your photos the look of old iPhones — 5s, SE, 6s, 7, 8, and XS.

옛 아이폰 카메라 감성으로 사진을 찍는 웹 카메라입니다. 앱 설치 없이 브라우저에서 바로 쓸 수 있어요. 사진은 기기 안에서만 처리되고, 서버로 올라가지 않습니다.

**지금 열어 보기:** [https://retro-iphone-cam-3rv.pages.dev](https://retro-iphone-cam-3rv.pages.dev)

## 홈 화면에 추가

한 번 넣어 두면 앱처럼 바로 열 수 있어요. 카메라 권한은 처음 촬영할 때 한 번만 물어봅니다.

**iPhone (Safari)**
1. Safari로 위 링크를 엽니다.
2. 공유 버튼을 누른 뒤 **홈 화면에 추가**를 선택합니다.
3. 홈 화면 아이콘으로 다시 열면 전체 화면으로 쓸 수 있습니다.

**Android (Chrome)**
1. Chrome으로 위 링크를 엽니다.
2. 메뉴에서 **홈 화면에 추가** 또는 **앱 설치**를 선택합니다.

카메라는 HTTPS 또는 localhost에서만 켜집니다. 홈 화면에서 연 주소가 위 링크와 같으면 됩니다.

## 쓰는 법

- 위의 여섯 가지 모델 중에서 하나를 고릅니다. 색감만이 아니라 그 시절 센서와 ISP의 느낌(부드러운 해상력, 하이라이트, 그림자 노이즈)도 따라갑니다.
- 오른쪽 위 버튼을 누르면 화면 비율이 바뀝니다. **4:3**이 기본값이고, 그때 아이폰의 기본 사진 비율입니다. **1:1**은 그 시절 인스타그램 정사각, **16:9**는 와이드입니다. 미리보기에 잘리는 영역이 가려지고, 저장되는 사진도 그 비율로 잘립니다. 세로나 가로 모두 됩니다.
- 미리보기를 위아래로 밀면 노출이 바뀝니다. 밝힐 수 있는 범위는 그 기종의 조리개(f/2.2 또는 f/1.8)와 센서가 허용하는 만큼만입니다. 두 번 탭하면 0으로 돌아갑니다.
- 촬영한 사진은 앨범에 저장하거나 공유할 수 있습니다.

참고로 공개된 스펙 기준으로 SE 1세대는 6s와 같은 12MP입니다. (가끔 8MP로 적힌 글을 볼 수 있어요.)

## 어떻게 만들어졌나요

빌드 과정 없는 정적 웹 앱입니다. `index.html`, `styles.css`, `app.js`와 작은 PWA 파일만 있고, 프레임워크는 쓰지 않습니다. 미리보기와 저장은 기기에서 WebGL로 처리합니다.

로컬에서 보려면:

```bash
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080`을 엽니다.

## 시뮬레이션은 이렇게 돌아갑니다

노이즈나 흐림을 위에 덧그리지 않고, 그 시절 아이폰의 렌즈·센서·ISP를 짧은 파이프라인으로 흉내 냅니다.

1. 화면의 sRGB를 대략 선형 빛으로 되돌립니다.
2. 그 기종의 초점거리와 조리개(f/2.2 또는 f/1.8)로 렌즈를 재현합니다. 상은 왜곡 없는 직선(rectilinear)으로, 배율은 휴대폰 기본 1배 카메라와 같고 선택한 비율로만 자릅니다. 가운데는 비교적 선명하고 가장자리로 갈수록 회절과 수차가 커지며, 녹색 기하를 유지한 채 빨강·파랑이 아주 조금만 어긋나고, 자연스러운 비네팅과(예전 렌즈는) 약한 플레어가 생깁니다.
3. 입력을 그 기종의 원래 화소 격자 위에 먼저 올립니다(5s 800만, 1.5µm; SE·6s·7·8 1200만, 1.22µm; XS 1200만, 1.4µm). 그다음 그 세대의 풀웰·리드 노이즈 추정값으로 Bayer RGGB 센서를 샘플합니다. 광전자는 샷 노이즈(포아송, 전자가 많으면 가우시안 근사)와 리드 노이즈를 거친 뒤 풀웰에서 잘리고, ISO 게인을 곱한 다음 10비트 ADC로 양자화됩니다. 하이라이트가 날아가는 지점이 여기서 결정됩니다.
4. 그 시절 ISP 순서를 따릅니다. 디모자이크는 기종마다 다릅니다. 오래된 기종은 더 단순한 보간에 가깝고, 아주 가는 무늬에서 지퍼나 거짓 색이 조금 남을 수 있습니다. 이어서 색 노이즈를 더 세게 줄이는 NR, 잎·머리카락·천처럼 가는 결만 문지르는 에지 보존 스미어, 7·8의 약한 로컬 톤, XS의 Smart HDR 느낌(하이라이트를 조금 되돌리고 로컬 대비를 남김, 검은색은 그대로)이 들어갑니다. 기종별 색과 톤은 실제 JPEG에서 맞춘 작은 3D LUT(17³, `lut.png`)로 적용합니다. 루마 곡선은 같은 장면의 히스토그램을 맞춰 기종마다 다르게 두고, 검은색이 뿌옇게 뜨지 않도록 양 끝은 0과 1에 고정합니다. 샤픈은 그 시절 JPEG의 에지 MTF와 텍스처에서 잰 값으로 마지막에 걸립니다. 현대 사진을 그냥 흐리게만 만들지 않고, 가는 결은 뭉개지면서 큰 에지는 비교적 또렷하게 남도록 맞춥니다. JPEG 압축은 저장할 때만, 그 시절 품질로 들어갑니다. 맞춤에 쓴 원본 사진과 스크립트는 `calib/`를 보세요.

미리보기는 같은 해상력 느낌을 화면 크기에서도 보도록, 소스를 한 번 면적 필터한 뒤 화면 해상도로 돌립니다. 저장은 그 기종의 원래 해상도와 그 격자에서의 디모자이크로 저장합니다.

## How the simulation works

The look is not a painted grain or a uniform blur. Light is linearized, resampled onto that phone's native pixel grid (5s 8MP at 1.5µm; SE/6s/7/8 12MP at 1.22µm; XS 12MP at 1.4µm), then passed through that phone's lens (rectilinear, no barrel; the field of view is the phone's native 1x, cropped to the chosen ratio; diffraction, corner aberrations, a tiny red/blue CA offset that leaves green geometry alone, residual cos⁴-like vignetting on already-corrected frames, mild flare on older glass), a Bayer RGGB sensor (shot and read noise, full-well clip, ISO gain, 10-bit ADC), and an era-style ISP: a softer bilinear-leaning demosaic on older models (with a little zipper and false color on fine detail), chroma-heavier NR, edge-aware texture smear on foliage, hair and fabric, light local tone on the 7 and 8, an XS Smart HDR approximation that keeps true blacks, a 17³ color LUT fitted to real JPEGs, with a per-model luma curve from histogram matching (endpoints pinned at 0 and 1 so blacks stay true), then sharpening whose halo and strength were fitted to those JPEGs' MTF50 and texture energy. Saved photos and the preview both carry that era's resolving power — mushy fine texture with crisp-ish edges — rather than a modern sensor's detail merely resized to 8MP or 12MP. The preview area-filters the source and applies the same scene-frequency smear at view size so the loss of detail is visible full-screen, not only in a 100% crop. JPEG is applied only when a photo is saved, at that era's quality. Calibration sources and scripts live in `calib/`.

## 샘플 사진 출처

테스트와 샘플에 쓴 거리 사진은 James Ó Nuanáin의 *Inverness Street Market from Camden High Street 2020*입니다. 라이선스는 [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/).

## 라이선스

이 프로젝트의 코드는 MIT License, Copyright (c) 2026 Haram Oh 입니다. 자세한 내용은 `LICENSE`를 보세요.
