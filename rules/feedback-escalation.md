# 실수→시스템 방지 루프 (Feedback Escalation Protocol)

에이전트가 같은 실수를 반복하면, 점점 더 강한 방어선으로 자동 승격한다.

## 4-Level 방어 사다리

| Level | 위치 | 강도 | 예시 |
|-------|------|------|------|
| 0 | 대화 중 교정 | 휘발 | "그거 말고 이렇게 해" |
| 1 | knowledge/*.md | 소프트 | LLM이 세션 시작 시 참조 |
| 2 | rules/*.md | 미디엄 | 매 세션 자동 로드, 가이드라인 |
| 3 | hooks + scripts | 하드 | 코드가 프로그래밍적으로 차단 |

## 승격 트리거

- **Level 0 → 1**: 같은 교정 2회 → knowledge/ 항목 추가
- **Level 1 → 2**: 같은 knowledge 항목이 3회 이상 무시됨 → rules/*.md에 명시적 규칙 추가
- **Level 2 → 3**: 규칙이 존재함에도 위반 반복 → hooks/ 코드 또는 scripts/ 체크로 하드 강제

## 승격 판단 기준

승격 전 확인:
1. **빈도**: 같은 패턴이 3회 이상 반복되는가?
2. **비용**: 이 실수가 발생하면 수정 비용이 큰가?
3. **자동화 가능**: 프로그래밍적으로 탐지/차단할 수 있는가?

3개 모두 Yes면 즉시 승격. 2개면 다음 발생 시 승격. 1개면 현재 레벨 유지.

## 실수 로그

훅이 잡은 모든 실수는 `~/.omc/mistake-log/YYYY-MM-DD.jsonl`에 기록된다.
분석: `bash scripts/escalation-check.sh [일수]`

## 승격 실행 절차

### Level 1 → 2 (knowledge → rule)

1. knowledge/ 항목에서 3회 이상 반복된 패턴 식별
2. 해당 패턴을 rules/ 의 적절한 파일에 명시적 규칙으로 추가
3. knowledge/ 원본 항목에 `→ rules/에 승격됨` 표시

### Level 2 → 3 (rule → hook/script)

1. `bash scripts/escalation-check.sh`로 반복 패턴 확인
2. 탐지 로직을 hooks/ TypeScript 또는 scripts/ bash로 구현
3. rules/ 원본 규칙에 `→ hooks/에 하드 강제됨` 표시
4. `npm run build` 후 `npm run check`로 검증

## 주기적 점검

세션 종료 시 또는 주간 리뷰 시:
- `bash scripts/escalation-check.sh 7` 실행
- ESCALATION CANDIDATE 항목이 있으면 승격 여부 판단
- 승격 실행 후 다음 주 결과 확인
