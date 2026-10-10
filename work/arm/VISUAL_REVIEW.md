# 팔 시각 품질 개선 1차 시안 — 2026-10-10

배포되지 않은 비교용 시안입니다. 이두·삼두의 표면 명암, 이두 섬유 가이드, 해당 부위의 경계 표현만 변경했습니다. BodyParts3D 형상과 기존 움직임은 유지했습니다. 개선은 확대 화면에서 확인되는 작은 변화이며, 전문 해부학 일러스트레이션 수준에 도달했다는 판정은 아닙니다.

## FAST_STATE / 작업 기준

- 기준 사이트 소스: `e3aa00e9555e0931b77772af8f41a774d898bb0c` (실제 gh-pages HEAD).
- 시안 브랜치: `codex/arm-visual-quality`.
- 저장소 전체 트리와 root/work/work/arm에서 AGENTS.md·HANDOFF.md를 찾지 못했습니다. CI에서도 해당 경로와 /AGENTS.md·/workspace/AGENTS.md의 부재를 기록했습니다. 기존 HANDOFF의 FAST_STATE를 읽었다고 주장하지 않습니다.
- 관리 작업 환경은 offline/pending 상태여서 그 환경의 미추적 파일은 확인할 수 없었습니다. 연결된 GitHub의 별도 브랜치와 GitHub Actions Chromium에서 작업·검증했습니다.
- 기존 `work/arm/README.md`, 구현·데이터 출처·검증 스크립트를 먼저 확인했습니다.
- 실제 GitHub Pages 배포·병합은 수행하지 않았습니다. 빌드의 `--publish`는 CI 작업 디렉터리의 생성 HTML만 갱신하며, 이번 워크플로는 이를 Pages에 배포하지 않습니다.

## 실제로 확인한 AnatoBase 자료와 차이

[제품 공개 페이지](https://anatobase.com/pages/product-video)의 공개 이미지 세 장을 실제로 열어 보았습니다. 초기 이미지 요청은 403으로 실패했지만 브라우저 User-Agent와 원래 공개 페이지 Referer를 사용한 요청으로 확인했습니다. 자료는 앱·저장소에 복제하지 않았습니다.

- [뒤침 시 위팔두갈래근 수축, 공개 첫 프레임](https://r2.anatobase.com/video/126/images/demo-1790264512543-360/001.webp): 굽힌 팔의 뼈와 이두를 단순한 색 면으로 구분하고, 동작 관계를 삽화와 설명으로 전달합니다.
- [팔 근육 레이어 앞면, 공개 첫 프레임](https://r2.anatobase.com/video/127/images/demo-1790268028185-360/001.webp): 중립 팔의 앞면 및 뼈대·근육층 관계를 확인했습니다. 현재 정면 0° 도해와 같은 부위를 비교했으나, 원근·자세·포함 범위는 완전히 동일하지 않습니다.
- [어깨세모근 공개 프레임](https://r2.anatobase.com/video/100/images/demo-1790267838862-360/007.webp): 면의 굴곡과 부착 방향을 따라 모이는 섬유 표현을 스타일 참고로만 확인했습니다. 삼각근의 섬유 패턴을 이두·삼두에 전용하지 않았습니다.

공개 샘플은 절제된 색과 설명 가능한 흐름·층 관계로 정보를 전달합니다. 현재 앱은 같은 오른팔을 3차원 표면에서 세 시점으로 투영하고 머리별 빨강·파랑·초록을 사용합니다. 이 색 구분은 유지하면서 대상 근육의 채도 대비를 조금 낮췄습니다. 공개 이두·팔 레이어 첫 프레임에는 상세 섬유가 없어, 그 자료에서 이두·삼두 섬유의 우열을 판단하지 않았습니다. 전체 영상, 유료 원본, 정밀 섬유 모델은 확인하지 않았습니다.

## 우선 문제 3개와 실제 수정

| 실제 관찰 | 원인 판단 | 수정 |
| --- | --- | --- |
| 근섬유 OFF에서 근복이 평평한 색 면으로 읽힘 | 깊이 판정은 있지만 채움은 단색. 형상이 잘못됐다는 증거로 판단하지 않음 | 기존 깊이 버퍼에서 부드러운 표면 법선을 근사하고 대상 부위에만 얕은 명암을 추가 |
| 이두 섬유의 일부 구간이 끊기거나 비슷한 호로 반복됨 | 기존 가이드의 짧은 분절과 표면 추적 방식. 확대하면 기존 섬유도 분명히 보이므로 ‘섬유가 없었다’는 진단은 아님 | 각 머리의 실제 삼각형 단면과 교차하는 표면 경로를 생성. 굵기를 조금 낮추고 간격에 작은 결정적 변화를 줌 |
| 강한 머리별 색 면과 균일한 경계가 깊이 정보보다 먼저 읽힘 | 높은 채도 대비와 같은 윤곽선 표현 | 대상 색을 흰색과 85:15로 혼합하고 경계 불투명도를 낮춤. 빨강·파랑·초록의 의미, 삼각근·뼈·UI는 유지 |

이두 가이드는 기존 장두 31개·단두 25개 분절 경로에서 각 24개의 표면 흐름 경로로 바꿨습니다. 선 개수를 늘려 해결하지 않았습니다. 삼두의 기존 비스듬한 가이드 및 건막 경로는 유지했습니다.

첫 명암 시안에서 삼두 측면에 삼각형 표면의 거친 얼룩이 보였습니다. 실제 전후 캡처를 보고 깊이 평활화를 조정한 뒤 다시 전체 비교·검증을 수행했습니다. 형상·동작·가려짐 계산을 변경하지 않았습니다.

구현: `surface-lighting.js`, `fiber-guides.json`/`fiber-guides.py`, `atlas-renderer.js`, `style.css`, 빌드 연결. 새 가이드는 렌더러의 별도 입력이며 원본 아틀라스의 섬유·메쉬 데이터를 덮어쓰지 않습니다.

## 동일 조건 Before / After

브라우저: GitHub Actions의 Chromium, viewport 900×1100, device scale 1. 기본 근육 100%, 지방 0, 재생 정지. 기준 arm.html은 위 기준 커밋에서 직접 가져왔습니다. 시안은 같은 작업 디렉터리에서 빌드했습니다.

각 상태마다 정면·후면·측면 × 0°·45°·90°·135° × 근섬유 ON/OFF × 불투명/반투명 = 48개 조건, 총 96개의 실제 SVG 브라우저 스크린샷을 캡처했습니다. 8개 비교 시트를 모두 직접 확인하고 정면·후면·측면 0°는 원래 크기로도 확인했습니다.

| 조건 | Before | After |
| --- | --- | --- |
| 섬유 ON · 불투명 | [12시점](visual-review/before-f1-t0.jpg) | [12시점](visual-review/after-f1-t0.jpg) |
| 섬유 OFF · 불투명 | [12시점](visual-review/before-f0-t0.jpg) | [12시점](visual-review/after-f0-t0.jpg) |
| 섬유 ON · 반투명 | [12시점](visual-review/before-f1-t1.jpg) | [12시점](visual-review/after-f1-t1.jpg) |
| 섬유 OFF · 반투명 | [12시점](visual-review/before-f0-t1.jpg) | [12시점](visual-review/after-f0-t1.jpg) |

| 확대 비교, 0° · 섬유 ON · 불투명 | Before | After |
| --- | --- | --- |
| 정면 | [원본 PNG](visual-review/before-front-0-f1-t0.png) | [시안 PNG](visual-review/after-front-0-f1-t0.png) |
| 후면 | [원본 PNG](visual-review/before-back-0-f1-t0.png) | [시안 PNG](visual-review/after-back-0-f1-t0.png) |
| 측면 | [원본 PNG](visual-review/before-side-0-f1-t0.png) | [시안 PNG](visual-review/after-side-0-f1-t0.png) |

[전체 96개 PNG와 실행 가능한 arm.html·baseline-arm.html 다운로드](https://github.com/kibornki/anatomy/actions/runs/38057373848/artifacts/11671488754) (Actions artifact, 14일 보관). ZIP 안의 arm.html은 자체 완결 파일이며 브라우저에서 열 수 있습니다. 저장소에는 비교 시트와 0° PNG를 남겼습니다. [조건별 측정 기록](visual-review/matrix.json).

## 해부학 및 기능 검증

해부학의 판단 근거는 공개 교육·학술 자료입니다.

- 이두의 방추형 근복과 길이 방향 섬유 배치는 [OpenStax 11.1](https://openstax.org/books/anatomy-and-physiology/pages/11-1-interactions-of-skeletal-muscles-their-fascicle-arrangement-and-their-lever-systems)을 참고했습니다. 새 선은 표면의 흐름을 설명하는 교육용 가이드이며 실측 근섬유 궤적이 아닙니다. 내부 건막까지 재구성하지 않았습니다.
- 이두 장두·단두의 기시, 장두의 가쪽 위치, 요골 조면으로 이어지는 관계는 [Elsevier Complete Anatomy의 Gray’s Anatomy 41판 기반 설명](https://www.elsevier.com/resources/anatomy/muscular-system/muscles-of-upper-limb-left/biceps-brachii-muscle-left/22937)과 대조했습니다.
- 삼두의 장두·외측두, 깊은 내측두, 척골 주두로 모이는 관계는 [같은 출처의 삼두 설명](https://www.elsevier.com/resources/anatomy/muscular-system/muscles-of-upper-limb-left/triceps-brachii-muscle-left/18585)과 대조했습니다. 기존 위치·부착점을 변경하지 않았습니다.
- 이두 새 가이드의 중립 표면 샘플 672개에서 원본 삼각형까지 최대 거리는 0.000062 미만의 장면 좌표 단위였습니다. 이는 표면에 붙는지의 기하 검증이며 실측 섬유 방향의 인증은 아닙니다.
- OpenSim 곡선은 기존 근육·힘줄 경로 길이 참조입니다. 실제 섬유 수축률·근활성도·힘으로 해석하지 않습니다.

[최종 시안 검증 실행](https://github.com/kibornki/anatomy/actions/runs/38057373848):

- 기존 `review-motion.cjs`: 0–135°의 136개 각도, 유한 좌표·뼈 배제·정지점 추적·근복 길이/두께·국소 부피 검사 통과.
- 기존 `review.py`: 24개 자세, 뼈 강체·어깨 고정·레이블 위치·색·건막 구멍·반투명·섬유 토글·재생·상태 복원·320/390px 모바일·다른 hub 항목 보존 검사 통과.
- 기존 `review-visible.py`: 세 방향에서 5° 간격의 84개 자세, 화면에서 보이는 표면의 뼈 관통 검사 통과.
- 기존 체형 기하 검증 통과. 추가 브라우저 검사에서 근육 60/160%, 지방 70, 지방 반투명, 0/135° 세 시점, 재로드 상태 복원과 초기화 통과.
- 96개 비교 캡처에서 pageErrors 0. 전후 48쌍의 부품별 가시 면적 샘플 수가 모두 동일했습니다.
- 테스트 삭제·기준 완화 없음. atlas-input/data, bone-fields, OpenSim 원본·길이 참조, motion/collision, 공유 체형 모듈의 Git blob SHA가 기준 커밋과 동일합니다.
- 해당 CI 장비에서 렌더 중앙값은 Before 71.3ms / After 91.4ms, 최대 147.8ms / 167.8ms였습니다. 명암·새 가이드의 비용이 있으며 모든 기기의 성능을 보장하는 수치는 아닙니다.

## 개선과 아직 부족한 부분

확대 시 이두의 길게 이어지는 흐름과 근복의 미묘한 밝기 변화가 더 읽힙니다. 삼두의 색 면에도 깊이 단서가 생기고 건막과의 대비가 조금 부드러워졌습니다. 세 시점·각도에서 새 실루엣 붕괴나 부착점 변경을 만들지 않았습니다. 화면을 작게 축소하면 변화가 크지 않으며, 반투명에서는 기존 레이어 겹침이 여전히 주된 정보입니다.

아직 이두의 근육-힘줄 조직 경계·내부 건막은 세분화되어 있지 않습니다. 삼두 건막은 기존 교육용 작화이며 실제 분할 데이터가 아닙니다. 이번에는 근거가 부족한 흰 힘줄 영역을 새로 칠하거나 메쉬를 재구성하지 않았습니다. 삼두의 측면 섬유 범위와 머리별 더 세밀한 패턴도 후속 검토 대상입니다. 135° 움직임은 기존 교육용 변형이며 조직 역학 시뮬레이션으로 개선한 것은 아닙니다.

## 다른 부위에 재사용할 원칙

1. 실제 렌더에서 형태·색·섬유·가려짐 문제를 분리한 다음 수정합니다. 단색 표현의 문제를 메쉬 오류로 단정하지 않습니다.
2. 표면 형상과 부착점을 유지하고 명암·가이드 입력을 별도로 다룹니다.
3. 가이드를 해당 근육의 표면에 붙이고 근육별 섬유 구조를 문헌으로 정합니다. 같은 규칙을 모든 근육에 적용하거나 선 수만 늘리지 않습니다.
4. 정지 자세의 확대 컷과 움직임·시점·투명도 매트릭스를 함께 확인합니다. 통과한 코드 검사와 실제 보이는 개선을 구분해 기록합니다.
5. 실측 데이터, 아틀라스 표면, authored 건막·섬유, 동작 참조의 출처와 한계를 유지합니다.

## 로컬 재현

```sh
python work/arm/build.py
# /workspace/artifacts/arm-implementation/arm.html
```

가이드를 의도적으로 다시 만들 때만 `python work/arm/fiber-guides.py`를 실행합니다. 원본 아틀라스·bone field·OpenSim 참조를 재생성할 필요가 없습니다. 전체 비교는 `.github/workflows/arm-visual-quality.yml`과 `review-visual.py`에 기록되어 있습니다.
