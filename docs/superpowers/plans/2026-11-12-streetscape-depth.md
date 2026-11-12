# Streetscape Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** v0.9.0의 거리·해안·주민 가림을 일관된 2.5D 표현으로 개선한다.

**Architecture:** 게임 모델/저장/UI는 변경하지 않는다. `src/render.js`의 아틀라스 페인터와 정적 캐시 구축을 보강하고, 이동체 앞의 국소 가림만 재그리기로 한다.

**Tech Stack:** HTML canvas 2D, native Node tests, Chromium Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-streetscape-depth-design.md`

## Global Constraints
- `AGENTS.md` 및 기존 v1 저장 형식 보존
- 한 번의 검증된 커밋만 `main`에 반영
- 정적 지도 캐시 유지, 벡터 스타일은 아틀라스/캐시 구축 때에만 그림

## Review Focus
- 주민이 집 뒤에서 튀어나오지 않는지
- 나무와 건물 이미지 정면/측면 광원이 일관적인지
- 확장 해안에서도 모래와 물 경계가 표시되는지
- 모바일 최소 360px의 기존 HUD와 화면이 겹치지 않는지
- 캐시 재생성 비용이 늘더라도 프레임별 불필요한 렌더링이 없는지

## Task 1: 공간 지오메트리
- [ ] `tests/render.test.mjs`에 물 접한 모서리 및 전경 가림 실패 테스트
- [ ] 테스트를 실행해 기대한 실패 확인
- [ ] `src/render.js`에 순수 판정과 정적 캐시 해안선 구현
- [ ] 테스트 통과

## Task 2: 건물/자연 아트
- [ ] 아틀라스 지붕·벽체·기단·수관을 동일 채광으로 정돈
- [ ] 주민 국소 가림 및 접지 해결
- [ ] Node 전체 테스트 및 브라우저 화면·조작 테스트

## Task 3: 검증/배포
- [ ] 저장·성능·PC/모바일 회귀 및 이미지 검토
- [ ] 최신 GitHub SHA 재검증, 변경 파일만 단일 커밋
- [ ] Vercel Production 배포 및 SHA 확인
