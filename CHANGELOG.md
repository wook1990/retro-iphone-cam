# 그때 아이폰 — 개발 기록

2026년 11월 15일, 하루 동안 5s·SE·6s·7·8·XS의 카메라 느낌을 브라우저에서 재현하는 정적 PWA를 만들고, 하람 님의 피드백을 따라 열한 번 고쳤습니다. 2026년 11월 16일, 요청에 따라 호스팅하던 Cloudflare Pages 프로젝트는 삭제했고, 코드는 이 저장소에 남아 있습니다.

A one-day build of a static PWA that gives photos the look of those iPhones. Eleven revisions followed Haram's feedback. The hosted demo was taken down on 16 Nov 2026 (KST); the code stays in this repo.

버전 번호는 서비스 워커 캐시 이름과 같습니다. v1.1은 커밋 제목이 그렇게 적혀 있지만, 캐시는 v2로 올라갔습니다.

---

## v1 — 2026-11-15

처음 동작하는 웹 카메라입니다. 앱 설치 없이 Safari와 Chrome에서 후면 카메라를 열고, 5s·SE·6s·7·8·XS 중 하나를 고른 뒤 그 기종의 해상도로 저장합니다. 홈 화면 추가와 오프라인 캐시도 들어 있습니다. 이 단계의 색과 느낌은 아직 필터에 가깝습니다.

*The first working camera: six looks, save at each model's resolution, add-to-home-screen, offline cache. The look was still mostly a filter.*

## v2 (커밋 제목 v1.1) — 2026-11-15

톤만 바꾸면 그 시절 사진이 되지 않아서, 저장본에 기종별 센서 노이즈, 노이즈 제거의 뭉개짐, 좁은 다이내믹 레인지, 낮은 해상력, JPEG, 렌즈 버릇을 넣었습니다. 미리보기는 같은 처리를 낮은 해상도로 보여 주고, 어두운 장면에서는 노이즈와 뭉개짐이 커집니다.

*Looks needed more than a grade: per-model noise, NR smear, tighter dynamic range, lower resolving power, JPEG, and lens habits, also in the preview.*

## v3 — 2026-11-15

기본 비율을 그때 아이폰 사진의 4:3으로 두고, 1:1(그 시절 인스타그램 정사각)과 16:9를 버튼 하나로 순환하게 했습니다. 미리보기에는 잘릴 영역이 보이고, 저장 사진은 모델 해상도에서 그 비율로만 잘립니다. MIT 라이선스와 한국어 README, 공개 저장소 준비를 같이 넣었습니다.

*4:3 default, plus 1:1 and 16:9; the preview masks the crop; stills are cropped at model resolution. Public-repo prep, MIT license, Korean README.*

## v4 — 2026-11-15

하람 님 피드백: 노이즈가 인위적으로 보였다.

저조도 노이즈를 감마 위에 덧그리지 않고, 선형 광량에서 샷 노이즈와 리드 노이즈로 넣도록 바꿨습니다. 그 시절 NR은 채도 쪽을 더 부드럽게 만듭니다. 미리보기는 프레임마다 노이즈 시드가 바뀝니다. 노출은 미리보기를 위아래로 밀어 조절하고, 밝힐 수 있는 범위는 조리개와 센서 세대에 맞춥니다. f/2.2(5s·SE·6s)는 f/1.8(7·8·XS)보다 좁습니다.

*Feedback: the noise looked artificial. Shot and read noise now happen in linear light, before gamma, with era chroma NR. Exposure is a vertical swipe, limited by each model's aperture and sensor.*

## v5 — 2026-11-15

노이즈와 흐림을 위에 덧그리는 방식에서, 짧은 물리 파이프라인으로 바꿨습니다. 기종별 렌즈(회절·수차·CA·비네팅·플레어), Bayer RGGB 센서(샷·리드, 풀웰 클립, ISO, 10비트 ADC), 그 시절 ISP(디모자이크·WB·CCM·NR·샤픈)를 거칩니다. 노출 범위는 같은 조리개·ISO 모델에서 오고, JPEG는 저장할 때만 들어갑니다.

*Replaced painted grain and blur with a short physical pipeline: lens, Bayer sensor, era ISP. JPEG only on save.*

## v6 — 2026-11-15

하람 님 피드백: 볼록렌즈처럼 보였다.

원인은 렌즈 반경을 UV 좌표로 계산한 것이었습니다. 정사각이 아닌 화면에서는 변 한가운데가 코너처럼 취급되어, 광학이 원형으로 오므라드는 “루페”처럼 보였습니다. 반경을 센서 mm로 계산하도록 고쳤습니다. 상은 왜곡 없는 직선(rectilinear)을 유지하고, 배럴 왜곡은 넣지 않으며, 녹색 기하는 그대로 둡니다. 시야는 휴대폰 기본 1배 카메라를 고른 비율로만 자른 것과 같습니다. 미리보기에서 PSF와 색수차가 기종 해상도 픽셀로 과하게 들어가던 것도 프레임 스케일로 맞췄습니다.

격자 테스트 24/24, 선 곧기 p95는 대체로 1px 미만, 스케일은 소스 크롭의 2% 안쪽.

*Feedback: it looked like a convex lens / loupe. The radius was computed in UV, which treated mid-edges as corners on a non-square frame. Radius is now in sensor millimetres; geometry stays rectilinear; FOV is a 1x crop only. Grid 24/24.*

## v7 — 2026-11-15

GSMArena Photo Compare와 Wikimedia Commons의 EXIF가 확인된 원본 JPEG에 색·톤·노이즈를 맞추고, ISP 순서를 그 시절에 가깝게 재배열했습니다. 기종별 색과 톤은 17³ LUT(`lut.png`)로 들어갑니다. 렌즈 반경 수정은 유지했습니다.

미리보기 26.4ms/프레임, 37.9fps. 격자 24/24.

*Calibrated color, tone, and noise against EXIF-confirmed originals; era ISP order (NR → local tone → XS HDR → LUT → sharpen). Lens fix kept. Preview 37.9 fps. Grid 24/24.*

## v8 — 2026-11-15

하람 님 피드백: 필터가 전부 너무 뿌옇다. 안개처럼만 보였다.

원인을 재고, 각각 고쳤습니다.

- LUT를 픽셀 짝으로 맞추다 어긋난 점이 들어가, 중간 톤 경사가 눌리고 하이라이트·그림자가 회색으로 메워졌습니다. 루마는 항등(identity)으로 되돌리고 색만 남겼습니다.
- 선형 그림자 토 +0.007이 sRGB에서 약 +0.10만큼 검은색을 띄웠습니다. 제거했습니다.
- 이미 보정을 거친 sRGB 입력에 풀 cos⁴ 비네팅을 씌워 코너가 짓눌렸습니다. 잔여만 남겼습니다.
- PSF σ가 Airy 지름의 0.45배로 약 2배 넓고, σ² 바닥 0.15가 네이티브 MTF50을 약 0.18 cy/px에 고정했습니다. 0.21×지름, 바닥 0.02로 줄였습니다.
- 플레어가 밝은 평면을 씻어 냈습니다. 줄였습니다.

검은색은 다시 제자리를 찾았습니다. 미리보기 37.4fps. 격자 24/24.

*Feedback: everything looked foggy. Root causes: a flattened LUT mid-slope, a +0.007 linear shadow toe (~+0.10 sRGB), full cos⁴ vignette on already-corrected frames, a PSF about 2× too wide (MTF50 pinned near 0.18 cy/px), and flare washing bright flats. Blacks went back to true. Preview 37.4 fps. Grid 24/24.*

## v9 — 2026-11-15

하람 님 피드백: 뿌연 것을 고치니 기종마다의 특색이 없어졌다. 조리개와 렌즈의 차이를 반영한 추억 보정이어야 하는데, 전부 비슷해 보였다.

v8에서 루마를 항등으로 두고 비네팅·플레어·PSF를 일괄로 줄인 탓입니다. 캠든 장면 360×270에서 기종 간 평균 ΔE가 4.29, 가장 가까운 SE–7은 2.34, 평균 루마 범위는 0.003이었습니다.

측정과 기억이 어긋나면 기억 쪽으로 조금 기대되, 실측은 유지했습니다. 루마 곡선은 같은 장면의 중앙 80% 히스토그램 매칭(끝점은 0과 1에 고정) 뒤에, 기억에 기대는 조정을 더했습니다.

- 5s: 따뜻하고 노란 편, 하이라이트는 강하게 클립. mid-slope 1.074.
- SE: 6s보다 차갑고 깨끗하며, 하늘이 더 푸르다. mid-slope 0.936.
- 6s: 따뜻하고 채도가 높으며 그림자가 깊다. mid-slope 1.094.
- 7: 차갑고 중립에 가깝고, 색이 넓고 깨끗하다. mid-slope 1.015.
- 8: 노란 따뜻함, 또렷한 샤픈 할로, 초기 HDR. mid-slope 1.119.
- XS: Smart HDR, 윗그림자가 조금 뜨고 하이라이트는 되살림, 피부는 따뜻한 주황, NR은 매끈. mid-slope 0.825.

캠든 폰 크기 평균 ΔE 11.49(최솟값 5.95). 역광·실내·해질녘에서도 평균 11.29 / 12.73 / 14.07. 검은색 1퍼센타일 0.001–0.022로, 우유빛으로 다시 뜨지 않았습니다. 미리보기 32.8fps. 격자 24/24.

*Feedback: fixing the haze made every phone look the same. Per-model luma curves from histogram matching, plus a slight lean toward remembered signatures, restored distinct looks without bringing the fog back. Camden phone-size mean ΔE 11.49 (v8 was 4.29). Preview 32.8 fps. Grid 24/24.*

## v10 — 2026-11-15

하람 님 피드백: 색온도 차이는 나는데, 그때 그 카메라들의 화소(해상력)도 구현해야 한다. 지금 폰 성능이 좋아서 결과가 너무 선명하다.

12MP끼리(6s·7·8·XS) 크기만 맞추면 구분이 안 됩니다. 입력을 그 기종의 원래 화소 격자 위에 먼저 올리고(5s 800만 1.5µm, SE·6s·7·8 1200만 1.22µm, XS 1200만 1.4µm), 그 격자에서 Bayer와 시절 디모자이크를 돌렸습니다. 오래된 기종은 더 단순한 보간에 가깝고, 가는 무늬에서 지퍼와 거짓 색이 조금 남을 수 있습니다. 잎·머리카락·천처럼 가는 결만 문지르는 에지 보존 스미어와, 실사 JPEG의 MTF50·텍스처에 맞춘 샤픈을 넣었습니다. 현대 사진을 그냥 흐리게 만들지 않고, 가는 결은 뭉개지면서 큰 에지는 비교적 또렷하게 남습니다. 미리보기는 12MP Bayer를 돌리지 않고, 소스를 한 번 면적 필터한 뒤 화면 크기에서도 같은 해상력 느낌이 나도록 했습니다.

캘리브레이션 스틸라이프(still_day)에서 십자 마크 SFR로 잰 네이티브 MTF50(실사 / 우리 출력): SE 0.372 / 0.367, 6s 0.387 / 0.362, 7 0.369 / 0.368, 8 0.407 / 0.387, XS 0.405 / 0.405. 390px 텍스처 에너지는 6s와 8이 실사와 같았습니다(각각 0.0720, 0.0828). 미리보기 20.6fps(SwiftShader 780×1040). 격자 24/24.

*Feedback: color temperature differed, but the photos were still too sharp — like a modern phone. Each model now runs on its native pixel grid with era demosaic, edge-aware texture smear, and fitted sharpening, including in the preview. Native MTF50 on the calibration still life matches the real JPEGs closely. Preview 20.6 fps. Grid 24/24.*

## v11 — 2026-11-15

하람 님 피드백: 주변을 뿌옇게 해서 인물 사진처럼 보였다. 그런 게 아니다.

옛 아이폰의 부드러운 해상력은 화면 전체에 거의 고르고, 코너가 조금 무른 정도는 100%에서나 보입니다. 우리 쪽에서는 세 가지가 가장자리를 가운데보다 흐리고 어둡게 만들고 있었습니다.

- 필드 의존 PSF(`σ = 회절 + aberrPx · r²`). 미리보기에서 5s·6s는 코너에 약 0.5–0.9px의 추가 블러가 들어가, 가운데만 선명한 인물 모드처럼 보였습니다. 실사 JPEG의 코너/가운데 MTF 비는 약 1이라, 이 항을 제거했습니다. 회절만 화면 전체에 고르게 남겼습니다.
- 미리보기용 CA 바닥값. 5s는 코너에서 약 2px의 빨강·파랑 어긋남이 생겨 가장자리가 번지고 무르게 보였습니다. 색수차는 이제 네이티브 저장본의 100%에서만, 몇 픽셀 수준으로 보입니다.
- 강한 잔여 비네팅(5s 0.42, 6s 0.36 등). v10 출력은 코너가 0.12–0.29스톱 어두웠습니다. 실사 still_day JPEG의 회색 보드는 이미 렌즈 셰이딩이 보정되어, 선형 기준으로 거의 평평했습니다(7은 0스톱, 13은 0스톱, 나머지는 조명 때문에 코너가 오히려 조금 밝음). 비네팅은 0.06–0.02로 줄여, 약 0.02–0.04스톱만 남겼습니다.

캠든 390px 텍스처의 코너/가운데 비(소스 자체는 장면 구도 때문에 0.620): 5s 0.626(v10에서는 0.452), 6s 0.627(0.514), 7 0.621, 8 0.635, SE 0.601, XS 0.585. 폰 크기에서 가운데와 가장자리의 선명도 비는 소스와 거의 같습니다. 미리보기 21.7fps. 격자 24/24.

*Feedback: the edges looked hazy, like portrait or bokeh mode. Old iPhones were not like that. Removed field-dependent blur, the preview CA floor, and the strong residual vignette. Softness is even across the frame. Preview 21.7 fps. Grid 24/24.*

## 2026-11-16 — 호스팅 종료

하람 님 요청으로 Cloudflare Pages 프로젝트 `retro-iphone-cam`과 그 배포를 모두 삭제했습니다. 예전 주소는 앱을 더 이상 제공하지 않습니다. 로컬이나 다른 정적 호스트에서 계속 쓸 수 있습니다. README를 보세요.

*The Pages project and all deployments were deleted on request. Self-host from this repo; see the README.*

---

## 파이프라인은 이렇게 돌아갑니다

How the pipeline works

노이즈나 흐림을 위에 덧그리지 않습니다. 대략 이 순서입니다.

1. 화면의 sRGB를 선형 빛으로 되돌립니다.
2. 그 기종의 초점거리와 조리개(f/2.2 또는 f/1.8)로 렌즈를 재현합니다. 상은 왜곡 없는 직선이고, 시야는 기본 1배를 고른 비율로만 자릅니다. 해상력 저하는 화면 전체에 고릅니다. 빨강·파랑의 아주 작은 색수차는 100%에서만 보이며, 녹색 기하는 그대로입니다. 비네팅은 실사 JPEG처럼 거의 없고, 예전 렌즈는 밝은 광원 옆에 약한 플레어가 생깁니다.
3. 입력을 그 기종의 원래 화소 격자 위에 올립니다. 그다음 Bayer RGGB로 샘플하고, 샷·리드 노이즈, 풀웰 클립, ISO, 10비트 ADC를 거칩니다.
4. 시절 ISP: 기종별 디모자이크, 채도를 더 줄이는 NR, 가는 결만 문지르는 에지 보존 스미어, 7·8의 약한 로컬 톤, XS의 Smart HDR 근사(검은색은 유지), 실사에 맞춘 17³ LUT, 끝점을 0과 1에 고정한 기종별 루마 곡선, 그리고 맞춘 샤픈. JPEG는 저장할 때만, 그 시절 품질로 들어갑니다.

미리보기는 같은 해상력 느낌을 화면 크기에서도 보도록 소스를 한 번 면적 필터한 뒤 화면 해상도로 돌립니다. 저장은 그 기종의 원래 해상도와 그 격자에서의 디모자이크로 저장합니다.

*Light is linearized, passed through a rectilinear lens, sampled on that model's native Bayer grid, then run through an era ISP and a fitted 17³ LUT. The preview area-filters the source so the era's resolving power is visible at phone size, not only in a 100% crop.*

## 아직 거친 점

Known rough spots

- 미리보기에서는 12MP Bayer를 돌리지 않습니다. 속도 때문에 면적 필터와 화면 크기 스미어로 근사합니다. 저장본과 100%가 조금 다를 수 있습니다.
- 5s는 같은 세트의 후기 still_day 사진이 없어서, 해상력은 캠든 장면과 차트·초기 스튜디오 컷에 더 기대어 맞췄습니다.
- SE와 7은 색이 가장 가깝습니다. 캠든 폰 크기에서 최솟값 ΔE는 약 5.95입니다.
- 실사 8은 100%에서 우리보다 샤픈이 더 바삭합니다. 폰 크기 텍스처는 맞췄습니다.
- 미리보기 프레임 속도는 이 환경의 SwiftShader에서 약 22fps로, 20fps 기준을 간신히 넘습니다. 실제 폰 GPU에서는 더 여유가 있을 가능성이 큽니다.
- 카메라는 HTTPS 또는 localhost에서만 켜집니다.
- 맞춤에 쓴 GSMArena 원본은 저작권 때문에 공개 저장소에 들어 있지 않습니다. 스크립트와 출처는 `calib/`를 보세요.
- 광학·ISP의 완전한 복제는 아닙니다. 실측에 기대되, 기억 쪽으로 조금 기울인 시뮬레이션입니다.
