---
description: "GitHub 이슈/PR 읽기 전용 트리아지. 모든 오픈 항목을 분석하여 /tmp에 리포트 생성. 절대 GitHub에 액션 안 함. 트리거: 'triage', '이슈 분석', 'PR 분석'"
---

# GitHub Triage — 읽기 전용 분석기

오픈 이슈/PR을 모두 가져와서 각각 병렬 에이전트로 분석. 리포트만 생성, GitHub 뮤테이션 절대 없음.

## Zero-Action 정책 (절대)

**금지**: `gh issue comment`, `gh issue close`, `gh pr merge`, `gh pr review`, `gh api -X POST/PUT/PATCH/DELETE`
**허용**: `gh issue view`, `gh pr view`, `gh api` (GET만), `Grep`, `Read`, `Glob`, `git log/show/blame`

## 증거 규칙

모든 주장에 GitHub 퍼머링크 필수:
`https://github.com/{owner}/{repo}/blob/{commit_sha}/{path}#L{start}-L{end}`

## 실행 순서

### Phase 0: 설정
```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
REPORT_DIR="/tmp/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_DIR"
COMMIT_SHA=$(git rev-parse HEAD)
```

### Phase 1: 데이터 수집
```bash
gh issue list --repo $REPO --state open --limit 500 --json number,title,state,createdAt,labels,author,body,comments
gh pr list --repo $REPO --state open --limit 500 --json number,title,state,createdAt,labels,author,body,headRefName,isDraft,mergeable,reviewDecision
```

### Phase 2: 분류
| 타입 | 감지 |
|------|------|
| ISSUE_BUG | `[Bug]`, 에러 메시지, 스택 트레이스 |
| ISSUE_FEATURE | `[Feature]`, `Enhancement` |
| ISSUE_QUESTION | `[Question]`, "how to", "?" |
| PR_BUGFIX | `fix` 접두사, `bugfix/` 브랜치 |
| PR_OTHER | 나머지 |

### Phase 3: 병렬 에이전트 (각 항목 1개씩)

각 이슈/PR마다 Agent 도구로 병렬 분석:

```
Agent(subagent_type="general-purpose", run_in_background=true, prompt="
REPO: {REPO}, COMMIT_SHA: {COMMIT_SHA}
분석 대상: Issue/PR #{number}: {title}

1. 코드베이스에서 관련 코드 찾기
2. 모든 주장에 퍼머링크 포함
3. {REPORT_DIR}/issue-{number}.md에 리포트 작성

절대 금지: gh issue/pr comment/close/merge/review/edit
")
```

### Phase 4: 최종 요약

`{REPORT_DIR}/SUMMARY.md` 작성:
- 전체 항목 수, 카테고리별 집계
- 주의 필요 항목 하이라이트
- 각 리포트 파일 경로
