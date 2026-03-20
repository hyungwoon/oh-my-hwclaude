# oh-my-hwclaude

> Claude Code를 더 똑똑하게 만들어주는 하네스 플러그인
>
> [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) 자동 설치 포함

Claude Code 쓰다 보면 답답할 때 있죠.
공백 하나 틀려서 Edit 실패하고, 같은 파일 또 읽고, 승인 버튼 반복해서 누르고...

**oh-my-hwclaude**는 이런 문제를 해결합니다.
설치 한 번이면 모든 프로젝트에서 바로 적용됩니다.

설치 시 [oh-my-claudecode(OMC)](https://github.com/Yeachan-Heo/oh-my-claudecode)도 함께 설치됩니다.
hwclaude가 **편집 정확도와 자율 실행**을, OMC가 **멀티에이전트 오케스트레이션**을 담당합니다.

---

## 뭐가 달라지나요?

### 1. 편집이 훨씬 정확해져요

기존 Claude Code의 Edit 도구는 `old_string`을 **정확히** 매칭해야 합니다.
공백 하나, 탭 하나만 틀려도 실패하고 다시 시도해야 하죠.

oh-my-hwclaude는 파일을 읽을 때 각 줄에 **해시 태그**를 붙여줍니다:

```
1#ZP|import { useState } from 'react'
2#MQ|
3#VR|export function Counter() {
4#WS|  const [count, setCount] = useState(0)
5#NK|  return <button>{count}</button>
6#TX|}
```

편집할 때는 이 태그로 위치를 참조하기만 하면 돼요:

```json
{ "op": "replace", "pos": "4#WS", "lines": "  const [count, setCount] = useState(42)" }
```

원본 내용을 글자 하나 안 틀리고 재현할 필요가 없습니다.
해시가 내용을 검증해주니까요.

> [The Harness Problem](https://blog.can.ac/2026/02/12/the-harness-problem/)에서 영감을 받았습니다.
> 이 방식 하나로 편집 성공률이 6.7% → 68.3%로 올라간 사례도 있어요.

### 2. 실패하면 알아서 복구해요

편집이 실패하면? 보통은 사용자가 직접 "다시 읽어봐", "파일 바뀐 것 같아" 이렇게 알려줘야 하죠.

oh-my-hwclaude는 **자동으로 복구 가이드를 주입**합니다:

| 상황 | 자동 대응 |
|------|----------|
| 해시 불일치 (파일이 바뀜) | "파일 다시 읽어서 새 해시 받아" 자동 안내 |
| old_string 못 찾음 | "파일 현재 상태 확인해" 자동 안내 |
| JSON 파싱 에러 | "형식 확인하고 다시 시도해" 자동 안내 |
| 기존 파일에 Write 시도 | 자동 차단 → hashline_edit 안내 |

사람이 개입할 일이 확 줄어듭니다.

### 3. 승인 버튼 덜 눌러도 돼요

hashline 도구 3개는 설치 시 **자동 승인**으로 등록됩니다.
매번 "Allow" 누르지 않아도 Claude가 알아서 읽고, 편집하고, 생성합니다.

---

## 설치

### 방법 1: 직접 설치 (3줄이면 끝)

```bash
git clone https://github.com/hyungwoon/oh-my-hwclaude.git
cd oh-my-hwclaude
./install.sh
```

### 방법 2: Claude Code한테 시키기

Claude Code 세션에서 그냥 이렇게 말하면 됩니다:

```
gh repo clone hyungwoon/oh-my-hwclaude /tmp/oh-my-hwclaude && cd /tmp/oh-my-hwclaude && ./install.sh 실행해줘
```

또는 더 간단하게:

```
oh-my-hwclaude 설치해줘. https://github.com/hyungwoon/oh-my-hwclaude
```

Claude가 알아서 클론하고, 빌드하고, 설정까지 해줍니다.
설치가 끝나면 Claude Code를 재시작하라고 안내가 나와요.

### 설치 후

**Claude Code를 재시작**하면 바로 활성화됩니다.

oh-my-claudecode(OMC)가 함께 설치된 경우, 재시작 후 아래 명령으로 OMC 초기 설정을 완료하세요:

```
/omc-setup
```

> Node.js 20 이상이 필요합니다.

### 제거하고 싶으면

```bash
cd oh-my-hwclaude
./uninstall.sh
```

또는 Claude Code에서:

```
oh-my-hwclaude 제거해줘
```

설정이 깔끔하게 원복됩니다. 기존 설정은 건드리지 않아요.

---

## 설치하면 뭐가 바뀌나요?

`~/.claude/settings.json`에 아래 항목이 추가됩니다:

| 항목 | 내용 |
|------|------|
| **MCP 서버** | `oh-my-hwclaude` — hashline_read, hashline_edit, hashline_write 도구 제공 |
| **PreToolUse 훅** | Edit/Write 사용 시 "hashline 써봐" 안내 |
| **PostToolUse 훅** | 편집 실패 시 자동 복구 가이드 주입 |
| **Stop 훅** | 작업 끝내기 전 "검증했어?" 리마인더 |
| **규칙 파일** | `~/.claude/rules/hwclaude-*.md` 4개 (사용법, 자율 실행, 품질 게이트, 모듈러 코드) |
| **커맨드** | `~/.claude/commands/hwclaude-*.md` 3개 (github-triage, work-with-pr, remove-deadcode) |
| **에이전트** | `~/.claude/agents/hwclaude-*.md` 6개 |
| **퍼미션** | hashline 도구 3개 자동 승인 |
| **oh-my-claudecode** | 미설치 시 `npm i -g oh-my-claude-sisyphus@latest`로 자동 설치 |

기존에 쓰던 MCP 서버, 훅, 규칙과 충돌하지 않습니다.
oh-my-claudecode와도 충돌 없이 함께 동작합니다 — hwclaude는 편집 레이어, OMC는 오케스트레이션 레이어입니다.
uninstall.sh로 제거하면 추가된 것만 깔끔하게 삭제돼요.

---

## 어떻게 동작하나요?

### hashline_read — 파일 읽기

파일을 읽으면 각 줄에 `줄번호#해시|` 접두사가 붙습니다.

```
hashline_read({ file_path: "/path/to/file.ts" })
```

해시는 줄 내용의 xxHash32를 256개 알파벳 딕셔너리에 매핑한 2글자 코드입니다.
같은 내용이면 항상 같은 해시, 내용이 바뀌면 해시도 바뀝니다.

### hashline_edit — 파일 편집

세 가지 연산을 지원합니다:

```javascript
// 줄 교체 (단일)
{ op: "replace", pos: "4#WS", lines: "새로운 내용" }

// 줄 교체 (범위)
{ op: "replace", pos: "4#WS", end: "6#TX", lines: ["줄1", "줄2", "줄3"] }

// 줄 뒤에 삽입
{ op: "append", pos: "3#VR", lines: "  // 여기에 추가" }

// 줄 앞에 삽입
{ op: "prepend", pos: "1#ZP", lines: "// 파일 헤더" }

// 여러 편집을 한 번에
{ edits: [편집1, 편집2, 편집3] }
```

### hashline_write — 새 파일 생성

기존 파일이 있으면 거부합니다. 새 파일 전용.

---

## 자동 보정 (LLM 실수 커버)

AI가 편집할 때 흔히 하는 실수를 자동으로 잡아줍니다:

- **들여쓰기 손실** — 원본에서 복원
- **여러 줄이 하나로 합쳐짐** — 감지해서 재분리
- **해시 접두사가 대체 텍스트에 섞임** — 자동 제거
- **diff 마커(+/-)가 포함됨** — 자동 제거
- **경계 줄 에코** — 주변 컨텍스트가 포함되면 자동 제거

---

## 프로젝트 구조

```
oh-my-hwclaude/
├── src/
│   ├── server.ts                    # MCP 서버 진입점
│   ├── tools/
│   │   ├── hashline-edit/           # 해시 기반 편집 엔진
│   │   │   ├── hash-computation.ts  # xxHash32 순수 TypeScript 구현
│   │   │   ├── executor.ts          # 편집 파이프라인 오케스트레이션
│   │   │   ├── edit-operations.ts   # 검증 → 정렬 → 적용
│   │   │   ├── autocorrect.ts       # LLM 실수 자동 보정
│   │   │   ├── validation.ts        # 해시 검증 + 오류 진단
│   │   │   ├── normalization.ts     # 텍스트 정규화
│   │   │   ├── edit-primitives.ts   # 줄 단위 편집 연산
│   │   │   ├── canonicalization.ts  # BOM/CRLF 처리
│   │   │   ├── diff-utils.ts        # unified diff 생성
│   │   │   ├── constants.ts         # 해시 딕셔너리
│   │   │   └── types.ts             # 타입 정의
│   │   └── hashline-read/           # 해시 태그 파일 읽기
│   ├── hooks/                       # Claude Code 훅
│   │   ├── pre-tool-use.ts          # Edit/Write 가드
│   │   ├── post-tool-use.ts         # 에러 자동 복구
│   │   └── stop.ts                  # 완료 검증
│   └── __tests__/                   # 테스트 (14개 전부 통과)
├── rules/                           # Claude Code 규칙 파일
│   ├── hashline-system.md           # hashline 사용법
│   ├── autonomous-execution.md      # 자율 실행 패턴
│   ├── quality-gates.md             # 코드 품질 게이트
│   └── modular-code-enforcement.md  # 모듈러 코드 아키텍처
├── agents/                          # 커스텀 에이전트 (6개)
├── commands/                        # 슬래시 커맨드 (3개)
│   ├── github-triage.md             # GitHub 이슈/PR 트리아지
│   ├── work-with-pr.md              # PR 라이프사이클
│   └── remove-deadcode.md           # 데드코드 제거
├── install.sh                       # 글로벌 설치 (OMC 자동 포함)
└── uninstall.sh                     # 깔끔한 제거
```

---

## 기여하기

이 프로젝트는 누구나 참여할 수 있습니다.

1. **Fork** — 이 레포를 Fork
2. **브랜치** — `git checkout -b feature/your-idea`
3. **개발** — 코드 작성 + 테스트 (`npx vitest run`)
4. **PR** — Pull Request 생성

### 아이디어가 있다면

- Issue를 먼저 열어주세요
- 작은 개선이라도 환영합니다
- 한국어/영어 모두 OK

---

## 기술 스택

- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict)
- **MCP**: @modelcontextprotocol/sdk
- **Hash**: xxHash32 (순수 TypeScript, 네이티브 의존성 없음)
- **Diff**: diff 패키지
- **Test**: Vitest

---

## 크레딧

- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) by Yeachan Heo — 멀티에이전트 오케스트레이션
- [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) by YeonGyu Kim — 원본 하네스 시스템
- [The Harness Problem](https://blog.can.ac/2026/02/12/the-harness-problem/) by Can Boluk — hashline edit 개념

---

## 라이선스

MIT — 자유롭게 사용하고, 수정하고, 배포하세요.
