# 복부 두 번째 시안

전거근과 외복사근의 맞물림·섬유 흐름을 새로 그리고 복직근을 추가한 독립 시안이다. 정면은 16° 비스듬한 시점이며, 측면과 함께 −10°에서 45°까지 몸통을 말았다 편다. 기존 통합본의 복부는 이 시안으로 교체하지 않는다.

## 골격과 그림

- `classic-coronal-anatomy.js`, `classic-side-anatomy.js`는 기존 상체 소스의 원본 복사본이다. 늑골, 척추, 골반의 윤곽과 비율 계수를 재사용한다.
- `side-skeleton.js`는 기존 `classic-side.js`의 골격 그리기 부분이다. 기존 측면의 세로 좌표 변환 `1.24y − 39`와 골반 높이 보정을 유지한다.
- 전거근의 늑골 갈래는 견갑골 안쪽 부착 부위로 모인다. 외복사근은 아래·안쪽, 내복사근은 주로 위·안쪽으로 흐른다. 내복사근은 곡선 절개창으로 노출한다.
- 복직근은 한 쌍의 연속 근육으로 그리고, 세 곳의 건획과 백선, 세로 섬유를 표시한다. 하부는 치골로 좁아진다.
- 흉곽과 어깨뼈는 강체로 움직이고 골반은 고정한다. 요추와 복벽의 변형은 움직임을 설명하기 위한 정성적 도해이며, 실제 수축률·활성도·피험자 치수는 아니다.
- 기존 색상, 선, 범례, 보기 버튼, 재생, 근섬유/반투명 체크박스와 슬라이더를 유지한다. 모바일 근육명 글자는 화면 기준 12px이다.

## 자료 기준

사용자가 첨부한 전거근·외복사근 사진은 형태 및 섬유 흐름 참고용이다. 사진을 추적하거나 재배포하지 않았다.

- OpenStax Anatomy & Physiology 2e, [11.4 Axial Muscles of the Abdominal Wall and Thorax](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-4-axial-muscles-of-the-abdominal-wall-and-thorax), 복벽 층과 섬유 방향, 복직근 및 건획.
- 같은 책 [11.5 Muscles of the Pectoral Girdle and Upper Limbs](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs), 전거근의 늑골 기시 및 견갑골 부착.
- 기존 상체의 흉곽·척추·골반 도해 기준을 그대로 유지한다.

## 재생성 및 확인

저장소 루트에서 `python drafts/abdomen-v2/build.py`를 실행하면 기존 `abdomen.html`의 UI를 바탕으로 `drafts/abdomen-v2.html`을 생성한다. 서버 루트에서 이 파일을 제공한 뒤 `review.py`의 URL을 해당 주소로 맞추어 실행한다. 기본 확인 주소는 `http://127.0.0.1:8766/abdomen-v2-draft.html`이다.

브라우저 검증: 두 방향 × 다섯 각도, 근육명 선의 실제 화면 적중, 흉곽 강체/골반 고정, 재생·정지, 근섬유 토글, 모바일 320/390/680px. 이 검증은 해부학적 형상이나 생체 역학적 정확성을 보증하지 않는다. 정면·측면의 정지 화면과 말린 화면을 별도로 육안 검토했다.
