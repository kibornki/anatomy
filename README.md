# Anatomy

가슴·등·이두·삼두·전완·허벅지 근육 애니메이션입니다.
정면·측면·후면, 재생, 각도 조절, 근섬유와 반투명 컨트롤을 제공합니다.

- 통합 화면: `index.html`
- 허벅지 교정본: `thigh.html`
- 전완: `forearm.html`

외부 파일이나 빌드 의존성이 없는 정적 HTML입니다. 모바일 브라우저에서도 동작합니다.
허벅지는 작화용 단순화 모델이며, 실측 생체역학 모델은 아닙니다.

## GitHub Pages

저장소 Settings → Pages에서 Source를 **Deploy from a branch**로,
Branch를 **gh-pages / (root)**로 지정하고 Save합니다.

게시 주소는 `https://kibornki.github.io/anatomy/`입니다.
허벅지 단독 주소는 `https://kibornki.github.io/anatomy/thigh.html`입니다.

게시 파일은 Chromium에서 재생·수축 변형·세 시점·상태 복원과
320px·390px·680px 모바일 컨트롤 표시를 확인한 교정본입니다.
