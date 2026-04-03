#!/usr/bin/env bash
# AI slop detector — staged 파일에서 AI 플레이스홀더 패턴 탐지
# comment-checker.ts의 패턴을 git hook용으로 이중화

set -euo pipefail

PATTERNS=(
  '//\s*TODO:\s*implement'
  '//\s*TODO:\s*add'
  '//\s*\.\.\.\s*rest\s*(of\s*)?(the\s*)?code'
  '//\s*\.\.\.\s*existing\s*code'
  '//\s*add\s*your\s*code\s*here'
  '//\s*implement\s*this'
  '//\s*placeholder'
  '//\s*FIXME:\s*implement'
  '/\*\s*\.\.\.\s*\*/'
  'throw\s+new\s+Error\s*\(\s*['"'"'""]Not\s+implemented['"'"'""]\s*\)'
)

# 자기 자신과 테스트 파일은 제외
EXCLUDE_FILES="check-ai-slop.sh comment-checker.ts"

# 인자가 있으면 해당 파일, 없으면 staged 파일
if [ $# -gt 0 ]; then
  FILES="$@"
else
  FILES=$(git diff --cached --name-only --diff-filter=ACM -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null || true)
fi

if [ -z "$FILES" ]; then
  exit 0
fi

FOUND=0

for file in $FILES; do
  [ -f "$file" ] || continue
  basename=$(basename "$file")
  skip=0
  for excl in $EXCLUDE_FILES; do
    [ "$basename" = "$excl" ] && skip=1 && break
  done
  [ "$skip" -eq 1 ] && continue
  for pattern in "${PATTERNS[@]}"; do
    matches=$(grep -nEi "$pattern" "$file" 2>/dev/null || true)
    if [ -n "$matches" ]; then
      if [ "$FOUND" -eq 0 ]; then
        echo "AI slop detected:"
        echo ""
      fi
      while IFS= read -r line; do
        echo "  $file:$line"
      done <<< "$matches"
      FOUND=1
    fi
  done
done

if [ "$FOUND" -ne 0 ]; then
  echo ""
  echo "AI placeholder comments must be replaced with real implementation."
  exit 1
fi
