# Anatomy

가슴·등·이두·삼두·전완·허벅지 근육 애니메이션입니다.
정면·측면·후면, 재생, 각도 조절, 근섬유와 반투명 컨트롤을 제공합니다.

- 통합 화면: `index.html`
- 허벅지 교정본: `thigh.html`
- 전완: `forearm.html`
- 등: `back.html`

외부 파일이나 빌드 의존성이 없는 정적 HTML입니다. 모바일 브라우저에서도 동작합니다.
허벅지는 OpenSim Gait2392의 경로 길이 변화를 참조한 작화용 모델입니다.
근복 외형·개별 근섬유 수축률·근활성도·힘을 실측 재현하지 않습니다.
검토 근거와 한계는 [ANATOMY_REVIEW.md](ANATOMY_REVIEW.md)를 확인하세요.
등에는 승모근 상·중·하부와 광배근·대원근·극하근·소원근의 직접 명칭을 모바일에서도 표시합니다.

## GitHub Pages

저장소 Settings → Pages에서 Source를 **Deploy from a branch**로,
Branch를 **gh-pages / (root)**로 지정하고 Save합니다.

게시 주소는 `https://kibornki.github.io/anatomy/`입니다.
허벅지 단독 주소는 `https://kibornki.github.io/anatomy/thigh.html`입니다.

게시 파일은 Chromium에서 재생·수축 변형·세 시점·상태 복원과
320px·390px·680px 모바일 컨트롤 표시를 확인한 교정본입니다.
