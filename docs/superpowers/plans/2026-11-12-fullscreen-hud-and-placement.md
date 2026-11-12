# 파도마을 풀스크린 HUD·건설 피드백 구현 계획

Spec: `docs/superpowers/specs/2026-11-12-fullscreen-hud-and-placement-design.md` · 기본 지침 `AGENTS.md`.

1. **헤더/지도 공간** `styles.css`, `index.html`, `tests/browser_e2e.py`
   - RED: 데스크톱/모바일 캔버스가 전체 높이를 차지하며 전폭 불투명 헤더가 없고 컨트롤 사이 겹침이 없는지 검증.
   - GREEN: `.stage`를 풀스크린으로 올리고 `.topbar`는 투명한 오버레이; identity, time/actions는 작은 반투명 그룹으로 분리. 각 HUD의 top을 반응형으로 재배치.
   - Check: Chromium 사각형/버튼 동작/캡처.
2. **건설 전 연결 피드백** `src/model.js`, `src/render.js`, `src/main.js`, `tests/model.test.mjs`, `tests/browser_e2e.py`
   - RED: 비용·점유·지형·항구 연결 미리보기의 무변경 결과, 마우스 선택 미리보기 텍스트와 레이어 상태 테스트.
   - GREEN: 순수 `evaluatePlacement` 정의 후 `place`에서 재사용. 연결 도로와 올바른 위치 구분을 지도에 표현, 상태 안내.
   - Check: Node tests + Chromium 건설/철거/배달.
3. **결과 통합** README 버전/설명 갱신. `npm run check`, `python3 tests/browser_e2e.py`, PC·모바일 스크린샷을 직접 확인한 뒤 검증 파일만 GitHub 단일 커밋. 배포 READY와 공개 응답을 구분해 확인.
