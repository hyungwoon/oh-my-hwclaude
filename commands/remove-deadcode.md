---
description: "LSP 검증 기반 데드코드 제거. TypeScript 미사용 코드를 병렬로 스캔, 검증, 제거. 트리거: 'deadcode', '데드코드', '미사용 코드 정리'"
---

# Remove Dead Code — LSP 검증 안전 제거

병렬 에이전트로 데드코드 스캔 → LSP 검증 → 원자적 커밋.

## 규칙

- **LSP가 법**: `Grep`으로 참조를 찾아서 0 참조 확인 후에만 제거
- **엔트리 포인트 보호**: `src/index.ts`, 테스트 파일, 설정 파일 — 절대 제거 금지
- **직접 제거 안 함**: 스캔 → 검증 → 배치 → 병렬 에이전트가 실행

## 오탐 방지

절대 데드코드로 표시하지 말 것:
- barrel `index.ts` re-export
- 테스트 파일에서 참조된 심볼
- `@public` / `@api` JSDoc 태그가 있는 심볼
- 팩토리 함수 (`createXXX`)
- 커맨드/스킬 정의

## Phase 1: 스캔

```bash
# TypeScript strict mode 미사용 검사
npx tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1
```

병렬로 추가 스캔:
- Agent: 고아 파일 찾기 (아무 파일에서도 import되지 않는 파일)
- Agent: 미사용 export 심볼 찾기

## Phase 2: 검증

각 후보에 대해:
```bash
# 전체 프로젝트에서 심볼 참조 검색
grep -r "symbolName" src/ --include="*.ts" --include="*.tsx" -l
```
- 0 참조 → 확인된 데드코드
- 1+ 참조 → 목록에서 제거

## Phase 3: 배치

- 같은 파일의 항목 → 같은 배치 (충돌 방지)
- 파일 전체 삭제 → 별도 배치
- 목표: 5-15 배치

## Phase 4: 병렬 실행

각 배치마다 Agent 실행:

```
Agent(subagent_type="general-purpose", run_in_background=true, prompt="
데드코드 제거 배치 N:

제거 대상:
- {file}:{line} — {symbol} (미사용 {type})

프로토콜:
1. 파일 읽기
2. grep으로 참조 재검증 (0 참조 확인)
3. 편집 적용
4. npx tsc --noEmit 실행
5. 실패 시: git checkout -- [files], 실패 보고
6. 성공 시: git add [specific files] && git commit
")
```

## Phase 5: 최종 검증

```bash
npx tsc --noEmit   # 반드시 통과
npm test            # 새로운 실패 확인
npm run build       # 반드시 통과
```

## 요약 리포트

```markdown
## 데드코드 제거 완료

### 제거됨
| # | 심볼 | 파일 | 타입 | 커밋 |
|---|------|------|------|------|

### 검증
- TypeScript: PASS/FAIL
- 테스트: X passing
- 빌드: PASS/FAIL
- 총 제거: N개 심볼, M개 파일
```

## 중단 조건
- 50개 초과 후보 → 사용자에게 범위 축소 요청
- 빌드 깨짐 + 복구 불가 → 중단 보고
