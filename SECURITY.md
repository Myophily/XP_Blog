# Security Policy

## Supported Versions

현재는 `main` 브랜치의 최신 코드만 보안 업데이트 대상으로 봅니다.

## Reporting a Vulnerability

보안 취약점이 의심되면 공개 issue에 exploit 세부 내용을 올리지 말아 주세요. GitHub의 private vulnerability reporting이 활성화되어 있다면 그 경로를 사용하고, 아니라면 최소한의 설명만 담은 issue를 열어 연락 방법을 조율해 주세요.

## Secrets

이 앱은 브라우저에서 Supabase anon public key를 사용합니다. anon key 자체는 공개될 수 있는 키지만, 데이터 보호는 반드시 Supabase Row Level Security 정책으로 보장해야 합니다.

`index.html`의 `xp-blog-config` 블록에는 브라우저용 anon public key만 넣으세요.

절대 공개하면 안 되는 값:

- Supabase service role key
- 데이터베이스 비밀번호
- 개인 access token
- 비공개 운영 토큰이나 서버 전용 환경 변수

공개 저장소에 Supabase 프로젝트 URL과 anon key를 남기고 싶지 않다면 배포 과정에서 `xp-blog-config` 블록을 치환하거나, 개인 배포 브랜치에서만 값을 관리하세요.
