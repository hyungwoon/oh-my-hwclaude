# Hashline Edit System

## 핵심 원칙

파일 편집 시 **hashline_read → hashline_edit** 워크플로우를 사용한다.
기존 Read + Edit 대신 MCP 도구인 hashline_read + hashline_edit을 우선 사용한다.

## 워크플로우

### 1. 파일 읽기 (hashline_read)

```
hashline_read({ file_path: "/path/to/file.ts" })
```

출력 형식:
```
1#ZP|import { useState } from 'react'
2#MQ|
3#VR|export function Counter() {
4#WS|  const [count, setCount] = useState(0)
5#NK|  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
6#TX|}
```

- `1#ZP` = 줄번호 1, 해시 ZP
- 해시는 줄 내용의 xxHash32 → 256개 딕셔너리 매핑
- 파일이 변경되면 해시도 변경됨 → stale edit 방지

### 2. 파일 편집 (hashline_edit)

세 가지 연산:

**replace** — 줄 교체 (단일 또는 범위)
```json
{
  "file_path": "/path/to/file.ts",
  "edits": [
    { "op": "replace", "pos": "4#WS", "lines": "  const [count, setCount] = useState(10)" },
    { "op": "replace", "pos": "4#WS", "end": "5#NK", "lines": ["  const [count, setCount] = useState(10)", "  const label = `Count: ${count}`"] }
  ]
}
```

**append** — 줄 뒤에 삽입
```json
{ "op": "append", "pos": "3#VR", "lines": "  // Component body" }
{ "op": "append", "lines": "// End of file" }
```

**prepend** — 줄 앞에 삽입
```json
{ "op": "prepend", "pos": "1#ZP", "lines": "// Header comment" }
{ "op": "prepend", "lines": "// File header" }
```

### 3. 새 파일 생성 (hashline_write)

기존 파일에는 사용 불가 — 새 파일 전용.

## 규칙

1. **편집 전 반드시 hashline_read** — stale 해시로 편집하면 실패
2. **여러 편집을 한 번에** — edits 배열에 모든 변경을 담아 한 번에 적용
3. **해시 불일치 시 재읽기** — 파일이 변경되었으므로 hashline_read로 새 해시 확보
4. **기존 파일은 hashline_edit** — Write/Edit 대신 항상 hashline_edit 사용
5. **새 파일은 hashline_write** — 기존 파일 덮어쓰기 방지

## 자동 보정

hashline_edit은 LLM의 일반적인 실수를 자동 보정:
- 해시라인 접두사가 대체 텍스트에 포함된 경우 → 자동 제거
- diff 마커(+/-)가 포함된 경우 → 자동 제거
- 들여쓰기가 손실된 경우 → 원본에서 복원
- 여러 줄이 하나로 합쳐진 경우 → 감지 및 재분리
- 경계 줄이 에코된 경우 → 자동 제거
