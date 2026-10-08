# Anatomy

상체·팔·전완·허벅지 근육 애니메이션입니다.
각 부위에서 정면·후면·측면, 재생, 각도, 근섬유와 반투명 컨트롤을 제공합니다.

- 통합 화면: `index.html`
- 가슴·등·전거근을 통합한 상체: `upperbody.html`
- 이두·삼두·삼각근을 통합한 팔: `arm.html`
- 허벅지: `thigh.html`
- 전완: `forearm.html`
- 기존 등 주소: `back.html` → 상체 후면

외부 파일이나 빌드 의존성이 없는 정적 HTML입니다. 모바일 브라우저에서도 동작합니다.
세 카메라는 같은 자세를 투영하며, 기존 가슴·등·이두·삼두 저장 상태는 새 부위로 옮깁니다.
상체·팔은 부착 방향과 관절 경로를 단순화한 작화용 모델입니다.
허벅지는 OpenSim Gait2392의 근육·힘줄 경로 길이 변화를 참조합니다.
근복 외형·개별 근섬유 수축률·근활성도·힘을 실측 재현하지 않습니다.
검토 근거와 한계는 [ANATOMY_REVIEW.md](ANATOMY_REVIEW.md)를 확인하세요.

## GitHub Pages

Settings → Pages의 Source는 **Deploy from a branch**, Branch는 **gh-pages / (root)**입니다.
게시 주소: https://kibornki.github.io/anatomy/

Chromium에서 세 시점, 재생·일시정지, 상태 복원·이전과
320px·390px·680px 모바일 컨트롤을 확인했습니다.
