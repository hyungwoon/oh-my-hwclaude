# 코드 품질 게이트

## 편집 품질

### 금지 패턴
- AI 생성 주석 슬롭: "// TODO: implement", "// Add your code here" 등
- 플레이스홀더 코드: `throw new Error('Not implemented')`
- 불필요한 console.log
- 하드코딩된 시크릿/토큰

### 필수 패턴
- 에러 핸들링: try/catch 또는 적절한 에러 전파
- 타입 안전성: any 사용 금지
- 불변 패턴: 객체 직접 수정 대신 spread/map/filter

## 파일 편집 규칙

### hashline_edit 우선
- 기존 파일 수정: 항상 hashline_read → hashline_edit
- 새 파일 생성: hashline_write
- 기존 Read/Edit/Write: hashline 도구가 불가능할 때만 사용

### 편집 범위 최소화
- 변경이 필요한 줄만 정확히 수정
- 불필요한 리팩토링/정리 지양
- 하나의 편집에 하나의 목적

## 자동 검사 (PostToolUse 훅)

편집 후 자동으로 확인되는 항목:
- Edit 실패 → 자동 복구 가이드 제공
- JSON 파싱 에러 → 자동 수정 가이드 제공
- Write on existing file → 차단, hashline_edit 안내
