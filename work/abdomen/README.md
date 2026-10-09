# 복부 말기·비틀기

현재 구현은 DBCLS BodyParts3D 3.0의 공통 3D 뼈·근육을 기존 SVG 색상과 조작 UI로 표시한다. 정면 16° 사선, 측면 90°, 비틀기 ±60°를 제공한다. 골반은 고정한다.

- `atlas-data.json`, `export-atlas.py`: 출처·해시·라이선스를 포함한 축소 아틀라스와 준비 스크립트.
- `atlas-renderer.js`: 공통 투영, 강체 뼈, 근육 skinning, 절개창과 표시 섬유.
- `visibility.js`, `atlas-contours.js`: 삼각형 깊이 검사와 보이는 외곽의 SVG 경로. 내부 메쉬 모서리를 근육 선으로 표시하지 않는다.
- `controls.js`, `twist.js`, `style.css`: 기존 조작·색상, 상태 이관, 반투명, 모바일 맞춤.
- `build.py`: HTML 생성. `--publish`는 독립 페이지와 통합본의 복부 문서만 갱신한다.
- `review.py`, `geometry-audit.py`: 조작·공통 골격·깊이·모바일·통합 상태와 표시 면의 접촉 진단.

```sh
python work/abdomen/build.py --publish
python -m http.server 8767 --bind 127.0.0.1
# 다른 터미널
python work/abdomen/review.py
python work/abdomen/geometry-audit.py
```

기본 검사 URL은 `http://127.0.0.1:8767/`이며 `ANATOMY_REVIEW_BASE`로 변경한다. 검사 수치·캡처는 `/workspace/artifacts/abdomen-atlas-review/`에 저장한다. Python 검사에는 NumPy, SciPy, Playwright와 Chromium이 필요하다.

자료·구현·검증의 정확한 범위는 [ATLAS_REVIEW.md](ATLAS_REVIEW.md)에 기록했다. 정적 형태는 아틀라스에 근거하며, 섬유 표시와 60° 비틀기 변형은 작화용 근사다. 검사 통과를 생리학적 정확성의 인증으로 해석하지 않는다. 이전 수작업 곡면 파일과 검토는 기록으로만 남아 있으며 현재 빌드에 포함하지 않는다.
