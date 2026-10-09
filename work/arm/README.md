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
- `hand-context.json`: 기존 앱의 작화용 손을 유지하기 위한 입력.
- `atlas-data.json`: 표시할 표면·섬유·부착 가이드.
- `atlas-renderer.js`: 공통 투영과 깊이 가림, 팔꿈치 변형, 라벨.
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
python work/arm/build.py --publish
python -m http.server 8767 --bind 127.0.0.1
# 별도 터미널: Playwright, Chromium 필요
python work/arm/review.py
```
