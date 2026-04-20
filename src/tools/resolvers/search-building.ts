/**
 * Resolver for {{SEARCH_BEFORE_BUILDING}} placeholder.
 * 출처: garrytan/gstack scripts/gen-skill-docs.ts (MIT)
 *
 * 짓기 전에 찾아라 — 3-Layer of Knowledge 요약.
 * 출처 원칙: https://github.com/garrytan/gstack/blob/main/ETHOS.md (MIT)
 */

export function resolveSearchBeforeBuilding(): string {
  return `## Search Before Building — 짓기 전에 찾아라

익숙하지 않은 패턴, 인프라, 보안/암호, 포맷/프로토콜을 구현하기 직전에 — **멈추고 검색**.

### 3-Layer of Knowledge

| 계층 | 설명 | 행동 |
|------|------|------|
| **Layer 1 — Tried & True** | 산업 표준, 런타임 내장 기능 | "이미 내장된 거 없나?" 확인 |
| **Layer 2 — New & Popular** | 최신 best practice, 생태계 트렌드 | 검색 후 비판적으로 수용 |
| **Layer 3 — First Principles** | 통념을 뒤엎는 original observation | 명명하고 기록 (Eureka Moment) |

### 검색 프로토콜 (구현 전 트리거)

동시성 / 인증 / 포맷 / 재시도 / 파일시스템 / 인코딩 / 날짜 / 해시 구현 전:

1. \`{runtime} {thing} built-in\` — Layer 1 확인
2. \`{thing} best practice 2026\` — Layer 2 확인
3. 공식 문서 — 검증`.trim()
}
