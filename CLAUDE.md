# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

비밀번호 기반으로 누구나 이름/별명으로 글을 남기고, 답글을 달고, 본인 글만 수정·삭제할 수 있는 방명록 웹앱. Next.js(App Router) 풀스택 + Prisma/PostgreSQL 구성이며 회원가입/로그인 없이 글마다 설정한 비밀번호로 본인 확인을 한다. Vercel에 서버리스로 배포하므로 DB는 Postgres(Supabase)를 쓴다 — SQLite는 서버리스 파일시스템 제약(읽기 전용, 인스턴스 간 파일 미공유) 때문에 쓸 수 없다. Supabase의 direct 연결(`db.<ref>.supabase.co:5432`)은 IPv6 전용이라 이 환경에서는 접속이 안 돼서, `DIRECT_URL`도 Session Pooler(`aws-0-<region>.pooler.supabase.com:5432`, IPv4)를 쓴다. `DATABASE_URL`은 Transaction Pooler(포트 6543, `pgbouncer=true`)를 쓴다. 요구사항 정의는 `docs/requirements.md`, API 스펙 전체는 `docs/api.md`에 있음 — 라우트를 수정하면 두 문서도 함께 갱신할 것.

## 자주 쓰는 명령어

```
npm run dev              # 개발 서버 (http://localhost:3000)
npm run build             # 프로덕션 빌드
npm run lint               # eslint .
npx tsc --noEmit           # 타입 체크 (별도 test 스크립트 없음, 이것이 사실상의 검증 수단)
npm run prisma:migrate     # 스키마 변경 후 마이그레이션 생성/적용 (prisma migrate dev, DATABASE_URL 필요)
npm run prisma:seed        # .env의 ADMIN_USERNAME/ADMIN_PASSWORD로 관리자 계정 생성/갱신
```

`npm run build`는 `prisma migrate deploy && next build`로 구성되어 있어 빌드 시(Vercel 배포 포함) 대기 중인 마이그레이션을 실제 Postgres DB에 자동 적용한다. 즉 `DATABASE_URL`이 없으면 로컬에서도 `npm run dev`/`npm run build`가 동작하지 않는다 — 로컬 개발도 배포에 쓰는 것과 동일한 Supabase DB에 연결해서 진행한다.

자동화된 테스트 스위트는 없다. 변경 후에는 `npx tsc --noEmit`과 관련 API를 직접 호출(curl/Invoke-WebRequest 등)해 검증하는 방식으로 확인해왔다.

### Windows/PowerShell 환경 주의사항

- 이 저장소는 Node.js가 새로 설치된 Windows 환경에서 작업되었다. PowerShell 툴 호출마다 프로세스가 새로 뜨므로 `node`/`npm`/`npx`를 쓰려면 매 호출마다 PATH를 다시 로드해야 한다:
  `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`
- 사내 프록시의 TLS 검사로 인해 `prisma generate`/`prisma migrate`가 인증서 오류(`unable to get local issuer certificate`)로 실패할 수 있다. 이 경우 `$env:NODE_OPTIONS = "--use-system-ca"`를 함께 설정하면 OS 신뢰 저장소를 사용해 해결된다.

## 아키텍처

### 인증 모델 (계정 없음)

- **일반 방문자**: 회원가입 없이 글/답글 작성 시 비밀번호를 직접 설정한다. 수정·삭제 시 해당 비밀번호를 다시 입력받아 `bcryptjs`로 대조한다 (`src/lib/password.ts`). 성공/실패 여부와 무관하게 세션이나 쿠키를 만들지 않는 stateless 방식이다.
- **관리자**: `prisma/seed.ts`가 `.env`의 `ADMIN_USERNAME`/`ADMIN_PASSWORD`로 `Admin` 테이블에 단일 계정을 생성한다. 로그인 성공 시 `src/lib/adminSession.ts`가 HMAC 서명된 토큰(`SESSION_SECRET` 기반, 자체 검증, DB/세션스토어 없음)을 `admin_session` HttpOnly 쿠키로 발급한다. 관리자만 비밀번호 확인 없이 강제 삭제(`/api/admin/entries/[id]`, `/api/admin/replies/[id]`)와 엑셀 내보내기(`/api/admin/export`)를 할 수 있다.
- 캡차(`src/lib/captcha.ts`)도 같은 패턴: 서버가 상태를 저장하지 않고, 질문(a+b)과 만료시각을 `CAPTCHA_SECRET`으로 서명한 토큰을 클라이언트가 그대로 들고 있다가 제출하면 서버가 서명을 재검증한다.

### 데이터 모델 & 삭제 정책

- `prisma/schema.prisma`: `Entry`(글) 1 : N `Reply`(답글), 별도 `Admin` 테이블. 모두 `passwordHash` 저장(평문 비밀번호는 어디에도 남지 않음).
- 삭제는 항상 소프트 삭제(`isDeleted = true`)다. 글이 삭제되면 하위 답글은 별도 처리 없이도 목록 조회 시 자동으로 함께 숨겨진다 — `GET /api/entries`가 `where: { isDeleted: false }`인 Entry만 조회하면서 Reply도 `isDeleted: false`로 중첩 필터링하기 때문. 답글 개별 조회/수정(`src/app/api/replies/[id]/route.ts`)도 원글이 삭제된 경우 함께 404 처리한다.
- API 응답 직렬화는 항상 `src/lib/serialize.ts`(`serializeEntry`/`serializeReply`)를 거쳐 `passwordHash`가 응답에 노출되지 않도록 한다. 새 응답을 추가할 때도 이 직렬화 함수를 재사용할 것.

### 요청 제한 (인메모리, 단일 인스턴스 가정)

`src/lib/rateLimit.ts`가 두 가지 독립된 정책을 제공하며 재시작 시 초기화되는 `Map` 기반 저장소를 쓴다:
- `checkPostRateLimit`: 글/답글 작성 시 IP당 10초 쿨다운 + 분당 5회.
- `isPasswordLocked` / `recordPasswordFailure` / `resetPasswordFailures`: 글·답글·관리자 로그인 각각에서 "대상+IP" 키로 5분 내 5회 실패 시 5분 잠금.

**Vercel 서버리스 환경에서의 한계**: 이 Map은 하나의 웜(warm) 람다 인스턴스 메모리 안에서만 유지된다. 서로 다른 인스턴스로 요청이 분산되면 제한이 인스턴스별로 따로 적용되어 전역적으로는 느슨해질 수 있다. 기능은 정상 동작하지만 스팸 방지 강도가 로컬/단일 서버 환경보다 약해질 수 있음을 감안할 것 — 더 엄격한 보장이 필요하면 Vercel KV/Upstash Redis 같은 외부 저장소로 교체해야 한다.

### 라우트 구조 (App Router)

- 페이지: `src/app/page.tsx`(목록, 클라이언트 컴포넌트 `GuestbookApp`이 전체 상태 소유), `src/app/admin/page.tsx`(관리자 로그인 폼).
- API는 REST 스타일로 `src/app/api/` 아래 위치: `entries`, `entries/[id]`, `entries/[id]/replies`, `replies/[id]`, `captcha`, `admin/login|logout|me|entries/[id]|replies/[id]|export`. Next.js 15 기준 동적 라우트 `params`는 Promise이므로 `const { id } = await params;` 형태로 받는다.
- 프론트는 서버 상태를 들고 있지 않고 전부 클라이언트에서 `fetch`로 API를 호출한다(`GuestbookApp` → `EntryForm`/`EntryCard`/`ReplyItem`/`ReplyForm`/`CaptchaField`/`Pagination`). 글/답글 카드는 각각 `view`/`edit`/`delete` 3가지 모드를 자체 state로 관리하며, 수정·삭제 성공 시 부모가 넘겨준 `onChanged` 콜백으로 목록을 다시 fetch한다(별도 전역 상태 관리 라이브러리 없음).

### 엑셀 내보내기

`src/app/api/admin/export/route.ts`가 `exceljs`로 "글"/"답글" 두 시트짜리 `.xlsx`를 생성해 `Content-Disposition: attachment`로 스트리밍한다. 관리자 세션 없으면 401. 새 필드를 Entry/Reply에 추가하면 이 라우트의 컬럼 정의도 함께 갱신해야 한다.

## 환경 변수 (`.env`)

| 변수 | 용도 |
|---|---|
| `DATABASE_URL` | Postgres 연결 문자열 (커넥션 풀러 사용 시 풀링된 URL) |
| `DIRECT_URL` | 마이그레이션용 Postgres 연결 문자열. Supabase는 true direct(5432)가 IPv6 전용이라 Session Pooler(5432, IPv4)를 사용 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `npm run prisma:seed` 실행 시 관리자 계정 생성/갱신에 사용 |
| `SESSION_SECRET` | 관리자 세션 토큰 서명 키 |
| `CAPTCHA_SECRET` | 캡차 토큰 서명 키 |

스키마를 바꾸면 `npm run prisma:migrate` 실행 후 필요 시 `npm run prisma:seed`로 관리자 계정을 다시 만든다. Vercel에 배포할 때는 프로젝트 Settings → Environment Variables에 위 변수를 모두 등록해야 하며(특히 `DATABASE_URL`/`DIRECT_URL`), 등록돼 있어야 빌드 시 `prisma migrate deploy`가 성공한다.
