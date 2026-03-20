# oh-my-hwclaude

Claude Code 하네스 — hashline edit, self-recovery hooks, autonomous execution.

[oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent)의 하네스 시스템을 Claude Code 전용으로 포팅.

## 뭐가 좋아지나요?

### 1. Hashline Edit — 편집 성공률 대폭 향상

기존 Claude Code의 Edit 도구는 `old_string` 정확 매칭이 필요합니다. 공백 하나만 틀려도 실패합니다.

hashline_edit은 **해시 태그로 줄을 참조**하므로 원본 내용을 정확히 재현할 필요가 없습니다:

```
42#VK|  function hello() {
43#MB|    console.log("hi")
44#WS|  }
```

```json
{ "op": "replace", "pos": "43#MB", "lines": "    console.log('hello world')" }
```

### 2. Self-Recovery — 에러 자동 복구

편집 실패 시 자동으로 복구 가이드가 주입됩니다:
- Hash mismatch → 파일 재읽기 안내
- Edit not found → 정확한 내용 확인 안내
- JSON parse error → 형식 수정 안내

### 3. Write Guard — 기존 파일 덮어쓰기 방지

기존 파일에 Write 사용 시 자동 차단하고 hashline_edit 안내.

## 설치

```bash
git clone https://github.com/hyungwoon/oh-my-hwclaude.git
cd oh-my-hwclaude
./install.sh
```

설치 후 Claude Code를 재시작하면 자동으로 활성화됩니다.

## 제거

```bash
cd oh-my-hwclaude
./uninstall.sh
```

## 구조

```
oh-my-hwclaude/
├── src/
│   ├── server.ts                    # MCP 서버 (hashline 도구 제공)
│   ├── tools/
│   │   ├── hashline-edit/           # 해시 기반 편집 시스템
│   │   │   ├── hash-computation.ts  # xxHash32 순수 TS 구현
│   │   │   ├── executor.ts          # 편집 실행 파이프라인
│   │   │   ├── edit-operations.ts   # 검증 → 정렬 → 적용
│   │   │   ├── autocorrect.ts       # LLM 실수 자동 보정
│   │   │   ├── validation.ts        # 해시 검증
│   │   │   └── ...
│   │   └── hashline-read/           # 해시 태그 파일 읽기
│   └── hooks/                       # Claude Code 훅
│       ├── pre-tool-use.ts          # Edit/Write 가드
│       ├── post-tool-use.ts         # 에러 복구
│       └── stop.ts                  # 완료 검증
├── rules/                           # Claude Code 규칙 파일
│   ├── hashline-system.md           # hashline 사용법
│   ├── autonomous-execution.md      # 자율 실행 패턴
│   └── quality-gates.md             # 코드 품질
├── install.sh                       # 글로벌 설치
└── uninstall.sh                     # 제거
```

## 설치하면 뭐가 바뀌나요?

| 항목 | 변경 |
|------|------|
| MCP 서버 | `oh-my-hwclaude` 서버 등록 (hashline_read, hashline_edit, hashline_write 도구) |
| PreToolUse 훅 | Edit/Write 사용 시 hashline 도구 안내 |
| PostToolUse 훅 | 편집 실패 시 자동 복구 가이드 |
| Stop 훅 | 작업 완료 전 검증 리마인더 |
| 규칙 파일 | `~/.claude/rules/hwclaude-*.md` 3개 |
| 퍼미션 | hashline 도구 자동 승인 |

## 기여하기

1. Fork
2. 브랜치 생성 (`git checkout -b feature/amazing`)
3. 커밋 (`git commit -m 'feat: amazing feature'`)
4. PR 생성

## 크레딧

- [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) by YeonGyu Kim — 원본 하네스 시스템
- [The Harness Problem](https://blog.can.ac/2026/02/12/the-harness-problem/) by Can Boluk — hashline edit 착안

## 라이선스

MIT
