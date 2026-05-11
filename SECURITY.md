# Security Policy

## Supported Versions

현재는 `main` 브랜치의 최신 코드만 보안 업데이트 대상으로 봅니다.

## Reporting a Vulnerability

보안 취약점이 의심되면 공개 issue에 exploit 세부 내용을 올리지 말아 주세요. GitHub의 private vulnerability reporting이 활성화되어 있다면 그 경로를 사용하고, 아니라면 최소한의 설명만 담은 issue를 열어 연락 방법을 조율해 주세요.

## Secrets

이 앱은 브라우저에서 Supabase anon public key를 사용합니다. anon key 자체는 공개될 수 있는 키지만, 데이터 보호는 반드시 Supabase Row Level Security 정책으로 보장해야 합니다.

절대 공개하면 안 되는 값:

- Supabase service role key
- 데이터베이스 비밀번호
- 개인 access token
- 운영 환경의 `config.js`

실제 설정은 `config.example.js`를 복사한 `config.js`에만 두고, 공개 저장소에는 예시 값만 커밋합니다.
