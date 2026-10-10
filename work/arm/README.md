# 팔 아틀라스와 팔꿈치 움직임

`python work/arm/build.py`로 먼저 로컬 시안을 만들고, 검토한 뒤
`python work/arm/build.py --publish`로 `arm.html`과 통합본의 팔 항목만 갱신한다.
정면·후면·측면, 재생, 0–135° 슬라이더, 근섬유·반투명 UI를 유지한다.
정면·후면은 16° 사선이다. 이두 장두·단두는 빨강·파랑,
삼두 장두·외측두·내측두는 빨강·파랑·초록이다.

## 자료와 범위

정적 골격·근육 외곽: BodyParts3D 3.0 오른팔, DBCLS © 2008,
CC BY-SA 2.1 Japan. STL 변환: Kevin Mattheus Moerman.
고정 커밋 `f0eeb6e843380cfe6b83797cf8c3e1af74de5e61`.
파일별 URL·해시는 `sources.json`, 라이선스는 옆 파일에 보관했다.

동작 기준: [OpenSim Arm26](https://github.com/opensim-org/opensim-models/blob/master/Models/Arm26/arm26.osim).
OpenSim Development Team (Reinbolt, Seth, Habib, Hamner),
Kate Holzbaur의 원 모델에서 파생. 모델 내부 명시 라이선스: CC BY 3.0.
참고 논문: Holzbaur, Murray, Delp, *A Model of the Upper Extremity for
Simulating Musculoskeletal Surgery and Analyzing Neuromuscular Control*,
Annals of Biomedical Engineering 33, 829–840 (2005).

`reference/arm26.osim`과 해시를 보관한다. `export-motion-reference.py`는
OpenSim 4.6의 실제 `Muscle.getLength()`를 어깨 고정, 팔꿈치 0–135°에서
계산하여 여섯 근육의 근육·힘줄 경로 길이를 `motion-reference.json`에 저장한다.
이 값은 측정된 근섬유 수축률이나 활성도가 아니다. 런타임에 OpenSim은 필요 없다.

삼두 후면 건막·사선 섬유 가이드는 사용자가 제공한 참고와 승인 시안에
기반한 작화다. 아틀라스가 분할한 힘줄이나 측정된 근섬유가 아니다.
동적 표면은 여전히 도해용 근사이며 실제 인체 변형의 인증 자료가 아니다.

## 수정 방식

- `motion.js`: 렌더링·섬유·검사가 공유하는 단일 변형 함수.
  삼두 원위부만 주두 뒤를 감싼다. 이두·상완근은 움직이는 원위 부착점으로 이어진다.
  근육 길이 변화는 Arm26 곡선에 따른다. 이두는 굽힘에서 짧아지고 두꺼워지며,
  삼두는 길어지고 얇아진다. 폄에서는 반대로 움직인다.
  국소 두께 배율 `1/sqrt(종방향 신장)`은 부피 보존을 위한 가이드다.
  전체 조직 체적·힘·근활성도는 검증하지 않았다.
- `prepare.py`: 원본 표면 위 건막·섬유를 생성하고 요골·척골을 중립 y=350에서
  절단한다. 팔꿈치 아래 68 단위를 표시하며, 절단면도 강체 회전한다.
- `collision.js`: 원본 뼈의 부호 거리장을 사용해 가까운 표면 법선으로 국소 보정한다.
  보정 이동은 12 단위 이내다. 숨겨진 전완뼈 끝까지 도망가는 이전 보정은 제거했다.
- `visibility.js`: 변형 면의 화면 샘플이 뼈 내부이면 제외한다.
  거리장 해상도 1.25, 화면 격자 .9 단위의 한계가 있다.
- `atlas-renderer.js`: 건막과 근육에 같은 변형을 적용한다. 짧은 근섬유 가림 조각은
  그리지 않는다. 같은 각도에서 시점·체크박스를 바꿀 때 표면 좌표를 재사용한다.
- `review-motion.cjs`: 136 각도의 국소 보정·원위 돌출·부착점,
  실제 변형 점의 길이·두께·근복 중심의 국소 체적비를 검사한다.
- `review-visible.py`: 세 시점 × 28 각도의 표시 표면을 역투영하여 뼈 거리장을 검사한다.
- `review.py`: 불투명·반투명, 뼈 강체 회전, 라벨, 근섬유, 조작, 모바일,
  통합본 상태 복원과 다른 부위가 바뀌지 않았는지 검사한다.

## 빠른 반복 작업

입력·거리장·동작 곡선은 보관한 값을 재사용한다. 반복적인 면 분할 단계는 제거했다.
동작 수정은 `motion.js`를 고친 뒤 **문제 프레임을 먼저** 확인한다.
전체 검사와 통합본 갱신은 수정이 끝난 뒤 한 번 실행한다.

```sh
# 일반적인 동작/표시 수정: 재다운로드, 거리장 재생성, OpenSim 설치 불필요.
python work/arm/build.py
# /workspace/artifacts/arm-implementation/arm.html 로컬 검토
node work/arm/review-motion.cjs
python work/arm/build.py --publish
python -m http.server 8767 --bind 127.0.0.1
# 별도 터미널: Playwright, Chromium
python work/arm/review.py
python work/arm/review-visible.py
```

표시 범위·건막 가이드가 바뀌었을 때만 `python work/arm/prepare.py`를 실행한다.
`atlas-input.json`의 원본 뼈가 바뀔 때만 `bone-fields.py`를 실행한다.
기준 모델이 바뀔 때만 OpenSim을 설치하고 `export-motion-reference.py`를 실행한다.


## Arm visual quality experiment (unpublished)

See [VISUAL_REVIEW.md](VISUAL_REVIEW.md) for the public reference review,
matched 48-condition Before/After captures, validation and remaining limits.
`surface-lighting.js` uses the existing depth buffer without changing meshes,
motion or visibility. `fiber-guides.json` supplies separate authored biceps
surface flow guides; they are educational approximations, not measured fascicles.
Regenerate those guides only with `python work/arm/fiber-guides.py`.
The original atlas, bone fields, OpenSim reference and posterior triceps guides
remain unchanged. The experiment workflow saves review images on its feature
branch and uploads standalone previews; it does not deploy GitHub Pages.

## 아티스트 조형 파일럿 — Phase 1

팔 화면에 해부학·조형·동일 시점 비교 모드를 추가한다. 실제 모드는 기존 BodyParts3D 메시와 팔꿈치 변형을 그대로 쓴다. 조형 모드는 해당 프레임의 같은 정점 구름에서 단면을 추출해 저해상도 3D 덩어리를 다시 만든다. 쇄골은 곡선형 로프트, 견갑골은 견봉–관절와–하각을 잇는 얇은 삼각판, 위팔뼈·요골·척골은 가변 단면 로프트로 표시한다. 삼각근, 이두근 머리들, 삼두근 머리들은 각각 어깨 캡/primary envelope로 묶고 상완근은 secondary 덩어리로 남긴다. 화면의 단면 가이드는 근섬유가 아니라 형상 읽기를 돕는 단면선이다. 이 크기와 외곽은 교육용 조형 근사이며 의학용 골격·근육 모델을 대체하지 않는다.

랜드마크 SC·AC·견관절 중심은 기존 상체 모션 자료의 rig 점을 팔 자료에 맞췄다. 두 파일이 공유하는 BodyParts3D FMA23130 위팔뼈 표면 402/752 정점의 중심과 서로 다른 균일 배율(0.80/0.58)을 사용했다. 정합 후 팔 표면 정점에서 상체 원본 오른쪽 위팔뼈까지의 최근접 거리 평균은 1.94, 95백분위는 3.03 아틀라스 단위다. SC·AC·견관절 중심은 각각 빗장뼈, 빗장뼈/견갑골, 위팔뼈두의 표면에 대한 거리로 확인한다. 구현값과 출처는 `artist-landmarks.json`에 있다.

요골결절·주두의 표시는 현재 아틀라스에서 분할된 뼈 부착점이 아니라 작화용 부착 가이드다. 이두·삼두의 길이 변화도 기존 Arm26 기반 도해용 변형이며 실측 근육 활성이나 조직 수축률이 아니다. 어깨띠와 위팔뼈는 이 팔꿈치 화면에서 고정된다. 상체 화면의 어깨 벌림 동작은 별도 리그이므로, 어깨 벌림과 팔꿈치 굽힘을 하나의 다관절 동작으로 결합했다고 설명하지 않는다.

비교 모드는 같은 팔 자세·카메라에서 왼쪽에 실제 아틀라스, 오른쪽에 저해상도 조형 덩어리를 분할 투영한다. 0°, 45°, 90°, 135°와 정면·후면·측면의 브라우저 캡처는 검증 작업의 `arm-sculpt-review` 아티팩트에 저장한다. 자동 검사는 단면 메시 연결, 랜드마크와 공통 위팔뼈 정합, 기존 팔꿈치 동작, 세 모드의 브라우저 렌더를 확인한다. 스크린샷의 조형적 타당성은 자동 테스트와 별도로 눈으로 확인해야 한다.
