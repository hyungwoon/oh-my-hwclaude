/**
 * Resolver for {{PREAMBLE}} placeholder.
 * 출처: garrytan/gstack scripts/gen-skill-docs.ts (MIT)
 *
 * 스킬 문서 상단에 삽입되는 공통 컨텍스트 블록.
 * 경량 버전 — branch 체크, session tracking 없음.
 */

export function resolvePreamble(): string {
  return `## 이 스킬을 호출하는 시점

- 사용자가 이 커맨드를 \`/\` 접두사로 명시적으로 요청했을 때
- 워크플로우 오케스트레이터가 위임했을 때

## 기본 원칙

- 요청 범위 안에서만 작업한다 — 요청하지 않은 파일/시스템 건들지 않음
- 완료 전 결과를 검증한다 (빌드/린트/테스트 통과 확인)
- 불확실한 결정은 진행하기 전에 사용자에게 확인 요청
- 추가 설명 없이 즉시 실행으로 시작한다`.trim()
}
