# 전완·허벅지 실제 아틀라스 사진 시안

팔·복부·상체와 동일한 BodyParts3D 3.0 원본 STL 표면을 사용한다.
DBCLS © 2008, CC BY-SA 2.1 Japan. STL 변환 Kevin Mattheus Moerman.
고정 커밋 `f0eeb6e843380cfe6b83797cf8c3e1af74de5e61`.
원본 URL·SHA256·면 수는 각 모델의 parts.source에 기록한다.
단위는 원본 mm이며, 축 변환·평행 이동·화면 균일 확대만 한다.
근육 폭이나 뼈 비율을 임의로 늘리지 않는다.

전완은 기존 회전 범위의 회외 끝 자세를 원본 정지 표면으로 보여준다.
시점은 기존 정면·엄지 쪽 측면·후면(0°/90°/180°)을 유지한다.
상완요골근·굽힘근군·폄근군·원회내근, 기존 깊은층 회외근·방형회내근을
실제 원본 구성 근육으로 표현한다. 굽힘근군은 FCR, FCU 두 기시부,
FDS 두 기시부, FDP, 장장근, 폄근군은 ECRL/ECRB/EDC/ECU 두 기시부다.
ECU의 FMA38507은 집합 분류이며 개별 표면 파일이 없으므로
원본 구성 요소 BP45/BP47을 사용한다. 기존 상완 연결부의 이두·상완근·삼두는
짧은 문맥으로 표시한다. 요골·척골·손목뼈·손허리뼈·손가락뼈는 원본 표면이다.
상완골과 연결부는 상완요골근 기시부보다 조금 위에서 자른다.

허벅지는 기존 무릎 폄 자세, 기존 32° 사선 정면·후면과 측면을 유지한다.
대퇴사두근 네 근육, 햄스트링 네 근육, 봉공근·내전근(긴모음근)만 포함한다.
새 복부·둔부·종아리 근육은 추가하지 않는다. 대퇴골·슬개골·경골·비골은
원본이고 경골·비골을 대퇴골 말단 기준 72mm 아래에서 잘라 단면을 닫는다.
골반 문맥은 기존 좌측 엉덩뼈를 반사한 자료이므로 정확한 우측 골반
비대칭을 재현했다고 주장하지 않는다. 발·발가락은 표시하지 않는다.

복부의 `AbdominalVisibility`/`AtlasContour`로 실제 삼각형의 깊이 가림과
벡터 외곽을 추출한다. 근섬유는 원본 표면을 횡단면으로 잘라 반경 교점을
연결한 작화 가이드다. 측정된 근섬유나 개별 근육의 정확한 우상각은 아니다.
흰 원위 힘줄 구분도 원본 면의 색 재질만 구분한 도해용 가이드이며 별도의
힘줄 분할 자료가 아니다. 도형이나 부착점을 새로 만들어 붙이지 않는다.
새 동작·근활성도·생체역학 모델을 구현하거나 검증한 시안이 아니다.

원본 STL 캐시: `/workspace/artifacts/limb-atlas-preview/source`,
`/workspace/artifacts/arm-atlas-preview/source`,
`/workspace/artifacts/independent-anatomy-review`.
필요 환경은 기존 NumPy, fast_simplification, Playwright, Chromium이다.

```sh
python work/limb-atlas-preview/prepare.py
python work/limb-atlas-preview/render.py
```

여섯 시점 PNG와 검토 페이지는 `drafts/limb-atlas-review`에 저장한다.
이 폴더는 정지 사진 시안만 만든다. 앱 페이지·통합본 적용은
별도의 `work/limb/build.py`가 담당한다.

개별 근육 색은 `colors.json`에 정의한다. 전완 근육·기시부 17개와
허벅지 근육 10개는 각 부위 안에서 모두 서로 다른 색이다. 흰 힘줄
재질과 상완 문맥 색은 개별 근육 색과 별도로 유지한다.
