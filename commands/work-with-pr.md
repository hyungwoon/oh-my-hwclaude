---
description: "PR 풀 라이프사이클: 워크트리 → 구현 → PR 생성 → 검증 루프(CI + 리뷰) → 머지. 트리거: 'PR 만들어', 'implement and PR', '구현해서 PR'"
---

# Work With PR — 풀 PR 라이프사이클

워크트리 격리 → 구현 → PR 생성 → CI/리뷰 검증 루프 → 머지까지 전체 자동화.

## Phase 0: 워크트리 설정

현재 작업 디렉토리를 건드리지 않도록 격리된 워크트리 생성.

```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
REPO_NAME=$(basename "$PWD")
BASE_BRANCH="main"

# 브랜치 생성
BRANCH_NAME="feature/$(echo "$TASK_SUMMARY" | tr '[:upper:] ' '[:lower:]-' | head -c 50)"
git fetch origin "$BASE_BRANCH"
git branch "$BRANCH_NAME" "origin/$BASE_BRANCH"

# 워크트리 생성 (형제 디렉토리)
WORKTREE_PATH="../${REPO_NAME}-wt/${BRANCH_NAME}"
mkdir -p "$(dirname "$WORKTREE_PATH")"
git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"

cd "$WORKTREE_PATH"
[ -f "package-lock.json" ] && npm install
```

## Phase 1: 구현

워크트리 안에서 직접 작업. 서브에이전트 위임 없이 직접 구현.

### 커밋 전략
- 3+ 파일 변경 → 2+ 커밋
- 5+ 파일 변경 → 3+ 커밋
- 구현과 테스트를 같은 커밋에

### 로컬 검증 (푸시 전)
```bash
npm run build   # 또는 프로젝트에 맞는 빌드 커맨드
npm run lint
npm test
```

## Phase 2: PR 생성

```bash
git push -u origin "$BRANCH_NAME"

gh pr create \
  --base "$BASE_BRANCH" \
  --head "$BRANCH_NAME" \
  --title "$PR_TITLE" \
  --body "$(cat <<'EOF'
## Summary
[변경사항 요약]

## Changes
[주요 변경 목록]

## Testing
- Build ✅
- Lint ✅
- Test ✅
EOF
)"

PR_NUMBER=$(gh pr view --json number -q .number)
```

## Phase 3: 검증 루프

모든 게이트가 통과할 때까지 반복:

```
while true:
  1. CI 대기 → gh pr checks "$PR_NUMBER" --watch --fail-fast
  2. CI 실패 → 로그 분석, 수정, 커밋, 푸시, continue
  3. CI 통과 → 리뷰 확인
  4. 리뷰 이슈 → 수정, 커밋, 푸시, continue
  5. 모두 통과 → break
```

### CI 실패 시
```bash
RUN_ID=$(gh run list --branch "$BRANCH_NAME" --status failure --json databaseId --jq '.[0].databaseId')
gh run view "$RUN_ID" --log-failed
```

## Phase 4: 머지 & 정리

```bash
# 사용자 확인 후 머지
gh pr merge "$PR_NUMBER" --squash --delete-branch

# 워크트리 정리
cd "$ORIGINAL_DIR"
git worktree remove "$WORKTREE_PATH"
git worktree prune
```

## 반패턴

| 위반 | 심각도 |
|------|--------|
| 메인 워크트리에서 작업 | CRITICAL |
| main에 직접 푸시 | CRITICAL |
| 코드 변경 후 CI 게이트 스킵 | CRITICAL |
| 검증 루프 중 관련 없는 코드 수정 | HIGH |
| 실패 시 워크트리 삭제 | HIGH |
