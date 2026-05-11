# XP Blog

Windows XP 스타일의 개인 블로그 템플릿입니다. 별도 빌드 과정 없이 HTML, CSS, JavaScript만으로 동작하며, 글과 카테고리 데이터는 Supabase에 저장합니다.

배포 후 `config.js`에서 사이트 제목과 소스 링크를 원하는 값으로 바꿀 수 있습니다.

## 주요 기능

- XP.css 기반 Windows XP 느낌의 데스크톱 UI
- 부팅 화면, 탭, 상태 표시줄, 팝업/확인 창
- 게시글을 파일 아이콘처럼 보여주는 Explorer 스타일 목록
- 게시글 상세 모달과 코드 블록 표시
- 작은 이미지 첨부 및 본문 삽입
- 계층형 카테고리 탐색
- owner 전용 게시글 작성
- owner 전용 카테고리 생성, 수정, 숨김, 삭제
- guest와 일반 로그인 사용자는 읽기 전용
- Supabase Auth, Database, Row Level Security 사용

## 기술 스택

- Vanilla HTML, CSS, JavaScript
- [XP.css](https://botoxparty.github.io/XP.css/)
- [Supabase JavaScript Client v2](https://supabase.com/docs/reference/javascript/introduction)
- Supabase Auth + PostgreSQL + RLS

## 프로젝트 구조

```text
.
├── index.html          # 화면 구조
├── app.js              # 인증, 게시글, 카테고리, 모달 로직
├── style.css           # XP 테마 보정 스타일
├── config.example.js   # Supabase 설정 예시
├── supabase.sql        # Supabase SQL Editor에서 실행할 스키마/RLS 스크립트
├── CONTRIBUTING.md     # 기여 가이드
├── SECURITY.md         # 보안 정책
├── LICENSE             # MIT 라이선스
├── bg.jpg              # 배경 이미지
├── booting.gif         # 부팅 화면 이미지
├── favicon.ico         # 파비콘
└── icon.png            # 게시글 아이콘
```

## 시작하기

### 1. 저장소 받기

```bash
git clone https://github.com/Myophily/XP_Blog.git
cd XP_Blog
```

### 2. Supabase 프로젝트 준비

1. Supabase에서 새 프로젝트를 만듭니다.
2. Supabase SQL Editor에서 `supabase.sql` 내용을 실행합니다.
3. Supabase Auth에서 owner로 사용할 계정을 만듭니다.
4. `supabase.sql` 맨 아래의 owner bootstrap 쿼리에서 이메일을 바꿔 한 번 실행합니다.

```sql
insert into public.site_owners (user_id)
select id
from auth.users
where email = 'owner@example.com'
on conflict (user_id) do nothing;
```

owner로 등록된 계정만 게시글과 카테고리를 관리할 수 있습니다.

### 3. Supabase 설정 파일 만들기

`config.example.js`를 복사해서 `config.js`를 만들고, Supabase 프로젝트의 URL과 anon public key를 넣습니다.

```javascript
window.XP_BLOG_SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_PUBLIC_KEY",
  siteTitle: "XP Blog",
  sourceUrl: "https://github.com/YOUR_USERNAME/XP_Blog",
  sourceLabel: "Source Code",
};
```

`config.js`는 `.gitignore`에 포함되어 있으므로 공개 저장소에 커밋하지 않습니다.

`siteTitle`, `sourceUrl`, `sourceLabel`은 선택 항목입니다. 포크해서 개인 블로그로 운영할 때 앱 제목과 좌측 하단 링크를 바꾸는 용도로 사용할 수 있습니다.

### 4. 로컬에서 실행

정적 파일 서버로 실행하면 됩니다.

```bash
python -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 엽니다.

Node 환경을 선호하면 다음처럼 실행할 수도 있습니다.

```bash
npx http-server
```

## 사용 방법

### 글 보기

로그인하지 않아도 공개된 카테고리와 게시글을 볼 수 있습니다. 왼쪽 Folders 영역에서 카테고리를 선택하면 하위 카테고리의 글까지 함께 필터링됩니다.

### 글 작성

1. owner 계정으로 로그인합니다.
2. Login 탭에 나타나는 Create New Post 폼을 사용합니다.
3. 카테고리를 선택하고 제목과 내용을 입력합니다.
4. 필요한 경우 이미지를 첨부한 뒤 Insert로 본문에 삽입합니다.
5. Post 버튼으로 저장합니다.

이미지는 Supabase Storage가 아니라 `posts.images` JSONB 컬럼에 base64 데이터로 저장됩니다. 작은 이미지에는 편하지만, 큰 이미지를 많이 올릴 계획이라면 Storage 방식으로 바꾸는 것이 좋습니다.

### 카테고리 관리

owner로 로그인하면 Folders 헤더의 Manage 버튼이 보입니다. 여기서 카테고리를 만들고, 계층을 바꾸고, 숨기거나 삭제할 수 있습니다.

숨김 처리된 카테고리와 그 게시글은 owner에게만 보입니다.

## Auth와 회원가입

현재 `index.html`의 Register 버튼은 기본적으로 비활성화되어 있습니다. 공개 블로그에서 임의 회원가입을 열지 않기 위한 설정입니다.

owner 계정은 Supabase Dashboard의 Authentication 메뉴에서 직접 만드는 방식을 권장합니다. 공개 회원가입을 열고 싶다면 Register 버튼의 `disabled` 속성을 제거하고, Supabase Auth 설정과 RLS 정책을 목적에 맞게 다시 검토하세요.

## Supabase 데이터 구조

`supabase.sql`은 다음 객체를 만듭니다.

- `site_owners`: owner 권한을 가진 Auth user ID 목록
- `categories`: 계층형 카테고리
- `posts`: 게시글과 첨부 이미지 JSON
- `is_site_owner()`: 현재 로그인 사용자가 owner인지 확인하는 RPC
- RLS policies: 공개 읽기, owner 전용 쓰기/수정/삭제

앱은 `posts`를 조회할 때 `categories`를 함께 조인합니다. 따라서 게시글은 유효한 `category_id`를 가져야 정상적으로 분류됩니다.

예전 버전의 `posts` 테이블을 이미 사용 중이었다면 `supabase.sql`의 migration helper가 필요한 컬럼을 추가합니다. 기존 게시글에는 카테고리를 하나 만들어 `category_id`를 채워 주세요.

## 공개 저장소 보안 메모

- 실제 Supabase 프로젝트 URL과 anon key는 `app.js`에 직접 쓰지 않습니다.
- 실제 값은 로컬 또는 배포 환경의 `config.js`에만 둡니다.
- `config.js`, `config.*.js`, `.env`, `.env.*`는 커밋 대상에서 제외되어 있습니다.
- Supabase anon key는 브라우저에서 쓰는 공개 키이지만, 데이터 보호는 반드시 RLS 정책으로 보장해야 합니다.
- service role key, database password, access token은 프론트엔드 코드나 공개 저장소에 절대 넣으면 안 됩니다.

## 기여하기

기여를 원한다면 [CONTRIBUTING.md](CONTRIBUTING.md)를 먼저 확인해 주세요. 보안 취약점은 공개 issue에 세부 내용을 올리지 말고 [SECURITY.md](SECURITY.md)의 안내를 따라 주세요.

## 라이선스

이 프로젝트는 [MIT License](LICENSE)로 배포됩니다.

## 배포

이 앱은 정적 사이트라서 GitHub Pages, Cloudflare Pages, Netlify 같은 정적 호스팅에 올릴 수 있습니다. 다만 배포된 사이트에서도 `config.js`가 함께 제공되어야 Supabase에 연결됩니다.

공개 저장소에는 `config.example.js`만 커밋하고, 실제 `config.js`는 배포 플랫폼의 비공개 파일 생성 과정이나 수동 업로드 방식으로 관리하세요.

## 참고

- [XP.css](https://botoxparty.github.io/XP.css/)
- [Supabase](https://supabase.com/)

Made for XP Blog contributors.
