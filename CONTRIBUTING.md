# Contributing

XP Blog는 작은 정적 웹 앱이라 기여 흐름도 가볍게 유지합니다. 버그 수정, 문서 개선, 접근성 보강, XP 스타일을 해치지 않는 기능 제안을 환영합니다.

## 시작하기

1. 저장소를 fork하고 로컬에 clone합니다.
2. `index.html`의 `xp-blog-config` JSON 블록에 본인 Supabase 프로젝트 값을 넣습니다.
3. Supabase SQL Editor에서 `supabase.sql`을 실행합니다.
4. 정적 서버로 실행합니다.

```bash
python -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 열어 확인합니다.

## 작업 기준

- PR에는 실제 Supabase URL, anon key, service role key, 데이터베이스 비밀번호를 커밋하지 않습니다.
- 로컬 확인을 위해 `xp-blog-config` 값을 바꿨다면 PR 전 기본값으로 되돌립니다.
- `config.js`와 `.env*` 파일은 공개 저장소에 올리지 않습니다.
- 외부 의존성 추가는 신중하게 제안해 주세요. 이 프로젝트는 vanilla HTML/CSS/JavaScript를 기본으로 합니다.
- UI 변경은 Windows XP 탐색기 느낌과 XP.css 스타일을 유지해 주세요.
- 사용자 입력을 화면에 넣는 코드는 `escapeHtml()` 같은 안전한 경로를 사용합니다.

## Pull Request

PR에는 다음 내용을 적어 주세요.

- 무엇을 바꿨는지
- 왜 필요한 변경인지
- 로컬에서 어떻게 확인했는지
- Supabase schema나 RLS 변경이 있다면 마이그레이션 영향

큰 기능은 먼저 issue로 방향을 맞춘 뒤 작업하면 리뷰가 훨씬 편합니다.
