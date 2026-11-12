# Early Game Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 첫 배달까지의 선택과 기다림을 설명하는 데이터 기반 예측·가이드를 구현한다.

**Architecture:** `src/model.js`에 상태를 변경하지 않는 예상/제안 함수. `src/main.js`는 오직 DOM 이벤트·상태 표시를 담당. 기존 `.note-card`와 `.order`를 재사용하여 새 패널을 만들지 않는다.

**Tech Stack:** Vanilla JS ES modules, canvas atlas, Node test, Chromium Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-early-game-clarity-design.md`

## Global Constraints
- AGENTS.md 준수, 저장 버전 유지, 신규 의존성 없음.
- 실제 검증 전 성공 선언 금지, 검증 단위 단일 커밋.

## Review Focus
- 여러 주문의 재료가 같을 때 예상의 정확성.
- 생산 건물과 길이 철거된 경우 무한 대기 처리.
- 이미 배달 가능한 주문은 도움 예상보다 높은 우선순위.
- `focusOrderId: null` 및 기존 저장 지원.
- 360px에서 편지/마을 조작 버튼 가림 없음.

## Task 1: Forecast & recommendation
- [ ] `tests/model.test.mjs`에 예측/제안 RED 테스트 작성 후 실패 확인
- [ ] `src/model.js`에 `forecastOrder`, `nextStep` 최소 구현
- [ ] `npm run check` 전체 GREEN 확인

## Task 2: Small UI & mobile
- [ ] `tests/browser_e2e.py`에 처음 목표, 편지 예상, 클릭 동작, 모바일 가시성 RED 테스트 추가
- [ ] `index.html`, `src/main.js`, `styles.css`의 기존 요소 재사용해 작동 구현
- [ ] Chromium PC/390px/360px 실제 렌더링/조작 및 스크린샷 확인

## Task 3: Docs and release
- [ ] README 정보 갱신, `npm run check`, Chromium 최종 통과 확인
- [ ] 원격 최신 SHA 대조, 단일 커밋 fast-forward 반영
- [ ] Vercel Production 배포 READY·커밋 SHA·도메인 연결 점검, 미검증 구간 보고
