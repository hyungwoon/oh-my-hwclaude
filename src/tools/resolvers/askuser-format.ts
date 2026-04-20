/**
 * Resolver for {{ASKUSER_FORMAT}} placeholder.
 * 출처: garrytan/gstack scripts/gen-skill-docs.ts (MIT)
 *
 * 사용자에게 질문/확인이 필요할 때 따르는 4-step 포맷.
 */

export function resolveAskuserFormat(): string {
  return `## 사용자 확인 요청 포맷 (4-step)

1. **Re-ground** — 현재 상황/맥락을 1-2문장으로 요약
2. **Simplify** — 결정이 필요한 핵심을 단순화해서 제시
3. **Recommend** — 명확한 추천안 1개와 그 이유 제시
4. **Options** — 대안 선택지가 있으면 간결하게 열거

예시:
> **Re-ground**: 기존 \`auth.ts\`에 OAuth 로직이 섞여 있습니다.
> **Simplify**: 분리할지 유지할지 결정이 필요합니다.
> **Recommend**: 별도 \`oauth.ts\`로 분리를 권장합니다 — 단일 책임 원칙 준수.
> **Options**: (A) 지금 분리 · (B) 현재 PR은 유지하고 다음 PR에서 분리`.trim()
}
