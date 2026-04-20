/**
 * Resolvers for {{BOIL_THE_LAKE}} and {{COMPLETENESS_TABLE}} placeholders.
 * 출처: garrytan/gstack scripts/gen-skill-docs.ts (MIT)
 *
 * boil-the-lake 원칙: AI 보조 코딩에서 완성도의 마지막 10%는 거의 공짜다.
 * 접근법 A(완전)와 접근법 B(90%)가 있을 때 — 항상 A.
 * 출처 원칙: https://github.com/garrytan/gstack/blob/main/ETHOS.md (MIT)
 */

export function resolveBoilTheLake(): string {
  return `## Boil the Lake — 완성도는 싸다

AI로 작성하는 추가 70줄은 몇 초 비용이다. 접근법 A(완전, ~150 LOC) vs 접근법 B(90%, ~80 LOC)가 있을 때 — **항상 A**.

- **Lake (boil 가능)**: 모듈 100% 테스트 커버리지, feature 완전 구현, 모든 edge case, 완전한 에러 경로 → 항상 boil
- **Ocean (boil 불가)**: 시스템 전체 재작성, 다분기 플랫폼 마이그레이션 → out-of-scope 플래그

Lake인지 Ocean인지 판단이 안 서면 사용자에게 묻는다.`.trim()
}

export function resolveCompletenessTable(): string {
  return `## Human Team vs AI 완성도 비교

견적/논의 시 "인간 팀 시간"과 "AI 보조 시간"을 함께 제시한다. 절대 시간만 말하면 의사결정이 과거 기준으로 왜곡된다.

| 작업 유형 | 인간 팀 | AI 보조 (CC/OMC) | Compression |
|-----------|---------|------------------|-------------|
| 보일러플레이트 / 스캐폴딩 | 2일 | 15분 | ~100x |
| 테스트 작성 | 1일 | 15분 | ~50x |
| 기능 구현 | 1주 | 30분 | ~30x |
| 버그 수정 + 회귀 테스트 | 4시간 | 15분 | ~20x |
| 아키텍처 / 설계 | 2일 | 4시간 | ~5x |
| 리서치 / 탐색 | 1일 | 3시간 | ~3x |

"2주 걸려요"라고 말하지 말고, "인간 팀 2주 / AI 보조 1시간"이라고 말한다.`.trim()
}
