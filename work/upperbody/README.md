# 상체 앱: 승인한 실제 아틀라스 적용

앞서 승인한 `work/upperbody-atlas-preview`의 원본 뼈·근육과 광배근
부착점 제약을 앱에 적용한다. 기존 상체의 11개 선택 근육, 정면·후면·측면,
15–120° 팔 외전, 조작 UI를 유지한다. 머리·복근·삼각근을 추가하지 않는다.
아틀라스 원본의 축과 균일 배율을 유지하며 흉곽을 가로로 늘리지 않는다.

팔·쇄골·견갑골은 매 프레임 강체로 움직인다. 광배근의 흉요부·장골부와
늑골 인접 기시부는 고정하고 삽입부만 상완골을 따라간다. 승인한 60° 시안과
같은 표면 맞춤을 5° 간격으로 계산하고 근육 표면·섬유 좌표를 보간한다.
0.02 단위의 변위 정밀도로 저장하며 60°에서 승인한 원본과 오차 <0.018이다.
팔을 높이 올리면 SVG 영역을 위로 확장해 팔뼈가 목 절단 높이에서 잘리지
않도록 한다. 목 절단은 상부 승모근에만 적용한다.

동작은 부착점을 고려한 도해다. 측정된 견갑상완 리듬, 근섬유, 생리적 부피
보존 또는 모든 자세의 조직 접촉을 검증한 시뮬레이션은 아니다.
광배근 폐곡면 부피는 중립 원본 대비 60°에서 약 1.179배, 120°에서 1.291배다.
원본 자체의 넓은 흉요부를 임의로 줄이지 않는다.

복부·팔과 같은 AbdominalVisibility/AtlasContour를 사용한다. 반투명은
근육 전체에 0.3을 적용하고 뼈와 근육의 가림을 별도로 계산한다.
허벅지·팔·복부 문서는 이번 적용에서 유지한다.

```sh
python work/upperbody/prepare.py
python work/upperbody/build.py
node work/upperbody/review-geometry.cjs
```

캐시된 pinned BodyParts3D STL과 기존 Python/Chromium 환경을 재사용한다.
출처·캐시·원본 라이선스는 `../upperbody-atlas-preview/README.md` 및
`LICENSE-BodyParts3D.txt`에 있다. BodyParts3D © 2008 DBCLS,
CC BY-SA 2.1 Japan. STL 변환: Kevin Mattheus Moerman.
앱에도 출처와 라이선스 링크를 표시한다.
