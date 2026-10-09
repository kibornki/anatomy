# 팔: 아틀라스와 삼두 건막

`arm.html`과 통합본의 팔 문서는 `python work/arm/build.py --publish`로 생성한다.
기존 정면·후면·측면, 재생, 0–135° 슬라이더, 근섬유·반투명 UI를 유지한다.
정면과 후면은 각각 16° 사선이다. 이두 장두·단두는 빨강·파랑,
삼두 장두·외측두·내측두는 빨강·파랑·초록이다.

골격과 근육의 기본 외곽은 앞서 시안에 사용한 BodyParts3D 3.0의 오른팔이다.
원본 STL 변환 배포본은 Kevin Mattheus Moerman / BodyParts3D,
고정 커밋 `f0eeb6e843380cfe6b83797cf8c3e1af74de5e61`이며,
파일별 URL·SHA-256은 `sources.json`에 기록했다.
BodyParts3D © 2008 DBCLS, CC BY-SA 2.1 Japan. 라이선스는 옆 파일에 보관한다.

- `atlas-input.json`: 원본 오른팔 표면을 균일 축척 .80으로 축소한 입력.
- `prepare.py`: 기존 표면 위에 삼두 후면의 넓은 건막을 샘플링하고,
  그 양쪽 가장자리로 향하는 사선 섬유 가이드를 만든다.
- `hand-context.json`: 예전 손 문맥의 보관 입력. 현재 표시에는 사용하지 않는다.
- `atlas-data.json`: 표시할 표면·섬유·부착 가이드.
- `atlas-renderer.js`: 공통 투영과 깊이 가림, 팔꿈치 뒤쪽 회전 경로, 라벨.
- `bone-fields.py`, `bone-fields.json`, `collision.js`: 원본 뼈의 부호 거리장과 근육 표면 제약.
- `refine-collision.cjs`: 뼈 근처에서 큰 면을 나누어 변형 보간을 보완.
- `visibility.js`: 선형 보간한 면의 골내 샘플을 제외하는 팔 전용 가림.
- `review-visible.py`: 세 시점 × 28 각도의 표면 샘플을 역투영하여 골내 위치가 아닌지 검사.
- `controls.js`, `style.css`, `page-template.html`: 기존 화면 구성과 저장값 이관.
- `review.py`: 실제 Chromium의 세 시점·굽힘·투명도·조작·통합본 검사.

삼두 건막의 범위와 근섬유 경로는 사용자가 제공한 후면 참고 이미지와
승인한 형태 시안에 근거한 **작화용 표현**이다. 아틀라스가 제공하는 힘줄
분할이나 측정된 근섬유가 아니다. 건막을 새로운 직선 틈으로 표시하지 않고
근육 뒤쪽 표면에 얹어, 아래쪽 주두 부근까지 이어지게 한다.
광범위한 근육 외곽을 새로 만들어 아틀라스에 검증된 것처럼 기록하지 않는다.

팔꿈치의 강체 회전과 부착점 변형은 교육용 도해의 근사다. 근활성도,
조직의 부피 보존, 개인별 근육 비율과 생리학적 수축률을 검증하지 않았다.
검사는 화면과 구현의 일관성을 확인하며 해부학적 정확성의 인증은 아니다.

```sh
# NumPy, SciPy 필요. 네트워크 없이 보관한 입력으로 다시 생성한다.
python work/arm/prepare.py
python work/arm/bone-fields.py
node work/arm/refine-collision.cjs
python work/arm/build.py --publish
python -m http.server 8767 --bind 127.0.0.1
# 별도 터미널: Playwright, Chromium 필요
python work/arm/review.py
python work/arm/review-visible.py
```

## 팔꿈치 수정과 표시 범위

요골·척골은 중립 좌표 y=330에서 절단하고 단면을 막는다. 절단면은
팔꿈치와 함께 강체 회전한다. 손·손목은 표시하지 않는다.
삼두 원위부는 팔꿈치 뒤쪽을 감싸도록 구간별 회전하며, 이두와 상완근의
안쪽 면은 뼈의 앞쪽 표면을 기준으로 보정한다.
부호 거리장은 원본 닫힌 뼈 표면에서 1.25 단위 격자로 추출한다.
변형된 꼭짓점뿐 아니라 큰 삼각형의 선형 보간도 관통 원인이므로,
화면 샘플에서 뼈 내부를 제외한다. 가림과 근육 반투명에 같은 규칙을 쓴다.
이 검사는 거리장의 해상도와 그림 샘플에 한정되며, 연속된 조직 접촉이나
근육의 체적 보존을 검증하는 생체역학 시뮬레이션이 아니다.
