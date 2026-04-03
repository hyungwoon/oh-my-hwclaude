#!/usr/bin/env bash
# Escalation analyzer — mistake log에서 반복 패턴을 찾아 승격 제안
#
# 승격 경로:
#   Level 1: knowledge/ (소프트 — LLM이 참조)
#   Level 2: rules/*.md (미디엄 — 매 세션 로드)
#   Level 3: hooks/scripts (하드 — 코드가 차단)
#
# 사용법:
#   bash scripts/escalation-check.sh          # 최근 7일 분석
#   bash scripts/escalation-check.sh 30       # 최근 30일 분석

set -euo pipefail

LOG_DIR="${HOME}/.omc/mistake-log"
DAYS="${1:-7}"
THRESHOLD=3

if [ ! -d "$LOG_DIR" ]; then
  echo "No mistake logs found at $LOG_DIR"
  echo "Hooks haven't caught any mistakes yet."
  exit 0
fi

# 최근 N일의 로그 파일 수집
CUTOFF=$(date -v-${DAYS}d +%Y-%m-%d 2>/dev/null || date -d "${DAYS} days ago" +%Y-%m-%d 2>/dev/null)
FILES=""
for f in "$LOG_DIR"/*.jsonl; do
  [ -f "$f" ] || continue
  fname=$(basename "$f" .jsonl)
  if [[ "$fname" > "$CUTOFF" ]] || [[ "$fname" == "$CUTOFF" ]]; then
    FILES="$FILES $f"
  fi
done

if [ -z "$FILES" ]; then
  echo "No logs in the last ${DAYS} days."
  exit 0
fi

echo "=== Mistake Escalation Report (last ${DAYS} days) ==="
echo ""

# 카테고리별 집계
echo "## Category Counts"
echo ""
cat $FILES | python3 -c "
import json, sys
from collections import Counter

counts = Counter()
details = {}

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        entry = json.loads(line)
        cat = entry.get('category', 'unknown')
        counts[cat] += 1
        if cat not in details:
            details[cat] = []
        detail = entry.get('detail', '')[:80]
        details[cat].append(detail)
    except json.JSONDecodeError:
        continue

threshold = ${THRESHOLD}
escalations = []

for cat, count in counts.most_common():
    marker = ' ← ESCALATION CANDIDATE' if count >= threshold else ''
    print(f'  {cat}: {count}{marker}')
    if count >= threshold:
        escalations.append((cat, count, details[cat]))

if escalations:
    print()
    print('## Escalation Suggestions')
    print()
    for cat, count, dets in escalations:
        print(f'  [{cat}] {count} occurrences in {${DAYS}} days')
        print(f'  Current level: hooks (Level 3 — already hard-enforced)')
        print(f'  Action: Investigate WHY this keeps happening despite hook enforcement.')
        print(f'  Recent examples:')
        seen = set()
        for d in dets[-5:]:
            if d not in seen:
                print(f'    - {d}')
                seen.add(d)
        print()
else:
    print()
    print('No patterns exceed the threshold (${THRESHOLD}). System is healthy.')
"

echo ""
echo "=== End Report ==="
