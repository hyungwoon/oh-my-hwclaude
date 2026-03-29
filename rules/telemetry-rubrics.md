# 텔레메트리 + 품질 루브릭 (Telemetry & Quality Rubrics)

> 하네스 품질을 측정하고 반복적으로 개선하기 위한 구조화된 텔레메트리 시스템.
> "측정할 수 없으면 개선할 수 없다. 반복이 왕이다."
>
> 프로젝트에 동일 목적의 로컬 규칙이 있으면 로컬 버전이 우선합니다.

## 저장 위치

`.claude/telemetry/{YYYY-MM-DD}.jsonl`

JSONL 형식: 한 줄에 하나의 JSON 레코드.

## 기록 시점

| 이벤트 | 트리거 |
|--------|--------|
| 태스크 완료 | 각 서브태스크/태스크 완료 시 |
| 세션 종료 | session-closing 절차 중 |
| 검증 완료 | fresh-context-verification 판정 후 |
| 이탈 감지 | contract-enforcement에서 DRIFTED 판정 시 |
| 핸드오프 생성 | context-compaction 실행 시 |

## 텔레메트리 레코드 스키마

```json
{
  "timestamp": "2026-03-30T10:30:00Z",
  "session_id": "abc-123",
  "event_type": "task_complete | session_end | verification | drift_detected | handoff",
  "task_id": "task-001",
  "task_description": "API 엔드포인트 구현",

  "scores": {
    "plan_adherence": 4,
    "verification_quality": 3,
    "context_efficiency": 4,
    "entropy_delta": 3,
    "code_quality": 4
  },

  "metadata": {
    "complexity_class": "simple | medium | complex",
    "files_changed": 3,
    "lines_changed": 150,
    "session_handoffs": 0,
    "plan_deviations_caught": 0,
    "verification_attempts": 1,
    "duration_ms": 120000,
    "model_used": "sonnet",
    "mode": "standalone | parallel | orchestrated"
  },

  "user_feedback": null
}
```

## 품질 루브릭 (0-5 점수 정의)

### plan_adherence (플랜 준수도)

| 점수 | 정의 |
|------|------|
| 5 | 플랜과 100% 일치, 스코프 크리프 없음 |
| 4 | 핵심 의도 일치, 미미한 구현 차이 |
| 3 | 대부분 일치하나 1-2개 스코프 외 변경 |
| 2 | 부분적 이탈, 핵심 요구사항 일부 미충족 |
| 1 | 심각한 이탈, A 대신 A' 구현 |
| 0 | 완전히 다른 것을 구현 |

### verification_quality (검증 품질)

| 점수 | 정의 |
|------|------|
| 5 | 모든 요구사항 충족, 실행 검증 통과, 엣지 케이스 포함 |
| 4 | 핵심 동작 검증 완료, 엣지 케이스 1-2개 누락 |
| 3 | 기본 동작 검증, 실행 검증 부분적 |
| 2 | 테스트 존재하나 피상적 (행복 경로만) |
| 1 | 동어반복 테스트, 실질적 검증 없음 |
| 0 | 테스트 없음 또는 모두 실패 |

### context_efficiency (컨텍스트 효율성)

| 점수 | 정의 |
|------|------|
| 5 | 컨텍스트 50% 이내 완료, 불필요한 파일 읽기 없음 |
| 4 | 컨텍스트 60% 이내 완료, 최소한의 낭비 |
| 3 | 컨텍스트 75% 이내 완료, 일부 불필요한 탐색 |
| 2 | 컨텍스트 90% 도달, 핸드오프 필요 |
| 1 | 컨텍스트 95% 도달, 작업 중단 |
| 0 | 컨텍스트 소진, 세션 강제 종료 |

### entropy_delta (엔트로피 변화)

| 점수 | 정의 |
|------|------|
| 5 | 레포가 이전보다 깨끗해짐 (정리 > 추가) |
| 4 | 변경분 완벽히 정합, 문서 동기화 완료 |
| 3 | 대부분 정합, 사소한 불일치 1-2건 |
| 2 | 일부 문서 미동기화, 스테일 주석 존재 |
| 1 | 다수의 불일치, 호출자 미업데이트 |
| 0 | 심각한 모순 도입, 레포 품질 저하 |

### code_quality (코드 품질)

| 점수 | 정의 |
|------|------|
| 5 | 클린 코드 원칙 완벽 준수, 리뷰어 만족 |
| 4 | 좋은 코드, 미미한 개선점 |
| 3 | 수용 가능, 일부 코드 스멜 |
| 2 | 기능은 작동하나 구조적 문제 |
| 1 | 스텁, TODO, 하드코딩 다수 |
| 0 | 빌드/타입 에러 존재 |

## 자동 채점 vs 수동 채점

| 지표 | 자동 채점 가능 여부 | 방법 |
|------|-------------------|------|
| plan_adherence | 부분 자동 | contract-enforcement 결과 반영 |
| verification_quality | 부분 자동 | fresh-context-verification 결과 + 테스트 커버리지 |
| context_efficiency | 자동 | 컨텍스트 사용량 비율 |
| entropy_delta | 부분 자동 | entropy-cleanup 결과 반영 |
| code_quality | 수동 | code-reviewer 결과 또는 사용자 피드백 |
| user_feedback | 수동 | 사용자가 결과에 대해 표현한 만족도 |

## 주간 분석 (주간 회고 확장)

주간 회고 실행 시 텔레메트리 분석을 추가한다:

### 분석 항목

1. **평균 점수 트렌드**: 각 지표의 주간 평균 변화
2. **가장 빈번한 실패 모드**: 어떤 지표가 가장 자주 낮은 점수?
3. **복잡도별 성공률**: Simple/Medium/Complex 태스크별 평균 점수
4. **모드별 성공률**: standalone/parallel/orchestrated별 비교
5. **이탈 패턴**: contract-enforcement에서 잡힌 이탈 유형 분류
6. **핸드오프 빈도**: 세션당 핸드오프 횟수 추이

### 보고서 형식

```
주간 하네스 품질 보고서 (YYYY-MM-DD ~ YYYY-MM-DD)

전체 점수: 4.1/5

| 지표 | 이번 주 | 지난 주 | 변화 |
|------|---------|---------|------|
| 플랜 준수도 | 4.2 | 3.8 | +0.4 |
| 검증 품질 | 3.5 | 3.5 | 0 |
| 컨텍스트 효율 | 3.8 | 4.0 | -0.2 |
| 엔트로피 | 4.0 | 3.5 | +0.5 |
| 코드 품질 | 4.1 | 4.0 | +0.1 |

가장 빈번한 실패 모드: 검증 품질 (평균 3.5)
권장 조치: 테스트 동어반복 감지 강화
```

## 사용자 피드백 수집

대화 중 다음 패턴 감지 시 `user_feedback` 필드 자동 채움:

| 신호 | 점수 |
|------|------|
| "완벽해", "정확해", "좋아" | 5 |
| 결과물 그대로 사용 | 4 |
| 약간 수정 후 사용 | 3 |
| "다시 해줘", 방향 전환 | 2 |
| "이건 아닌데", 거부 | 1 |
| 작업 포기/취소 | 0 |

## 통합 지점

- **contract-enforcement.md**: ALIGNED/DRIFTED 판정 → plan_adherence 점수
- **fresh-context-verification.md**: PASS/FAIL 판정 → verification_quality 점수
- **context-compaction.md**: 핸드오프 발생 → context_efficiency 점수 조정
- **entropy-cleanup.md**: 정리 결과 → entropy_delta 점수
- **quality-gates.md**: 코드 품질 검사 결과 → code_quality 점수 (hwclaude rules 참조)
- **autonomous-execution.md**: 세션 종료 검증 절차와 연동 (hwclaude rules 참조)
- 주간 회고: 텔레메트리 분석 보고서 생성

## 금지 사항

- **절대 금지**: 텔레메트리 기록 건너뛰기 (모든 이벤트 기록 필수)
- **절대 금지**: 점수를 자의적으로 부풀리기 (루브릭 엄격 준수)
- **절대 금지**: 텔레메트리 데이터 삭제 (이력 보존 — 트렌드 분석용)
- **절대 금지**: 사용자 피드백을 추정으로 대체 (명시적 신호만 기록)
