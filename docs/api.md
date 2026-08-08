# 방명록 API 문서

- 기준 버전: v1.0
- Base URL: `http://localhost:3000` (배포 시 실제 도메인으로 대체)
- 모든 요청/응답 바디는 `application/json` (엑셀 내보내기 응답 제외)
- 인증이 필요 없는 API는 비밀번호 확인(작성자 본인 확인) 또는 캡차 검증으로 대체됩니다.
- 관리자 API는 로그인 시 발급되는 `admin_session` HttpOnly 쿠키로 인증됩니다.

## 공통 사항

### 에러 응답 형식

```json
{ "error": "에러 메시지" }
```

### 공통 상태 코드

| 코드 | 의미 |
|---|---|
| 400 | 요청 값 검증 실패 (이름/내용 길이, 캡차 누락 등) |
| 401 | 관리자 인증 필요 (관리자 API에서만 사용) |
| 403 | 비밀번호 불일치 |
| 404 | 대상 글/답글이 존재하지 않거나 이미 삭제됨 |
| 429 | 요청 제한 초과 (도배 방지 / 비밀번호 다회 실패 잠금) |

### 스팸 방지 정책

- 글/답글 작성(`POST /api/entries`, `POST /api/entries/{id}/replies`): 동일 IP 기준 10초 쿨다운 + 1분당 최대 5회.
- 비밀번호 확인이 필요한 수정/삭제: 동일 대상(`entry`/`reply` id) + IP 기준 5분 내 5회 실패 시 5분간 잠금(429).
- 위 제한은 서버 인메모리 저장소 기반이며 단일 서버 인스턴스 기준으로 동작합니다. 재시작 시 초기화됩니다.

---

## 캡차

### `GET /api/captcha`

간단한 수식 캡차 문제를 발급합니다. 글/답글 작성 시 함께 제출해야 합니다.

**응답 `200`**
```json
{ "question": "3 + 5 = ?", "token": "<서명된 토큰 문자열>" }
```

- `token`은 서버 비밀키(`CAPTCHA_SECRET`)로 서명되어 있으며 만료시간(5분)을 포함합니다. 별도 저장소 없이 자체 검증됩니다.

---

## 글 (Entry)

### `GET /api/entries`

글 목록을 최신순으로 조회합니다. 각 글에는 삭제되지 않은 답글이 함께 포함됩니다.

**쿼리 파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `page` | number | 1 | 페이지 번호 (1부터 시작) |
| `pageSize` | number | 20 | 페이지당 글 수 (최대 30) |

**응답 `200`**
```json
{
  "entries": [
    {
      "id": 1,
      "name": "홍길동",
      "content": "방명록 내용입니다.",
      "createdAt": "2026-08-08T00:17:40.907Z",
      "updatedAt": null,
      "replies": [
        {
          "id": 1,
          "entryId": 1,
          "name": "답글러",
          "content": "답글 내용",
          "createdAt": "2026-08-08T00:18:06.820Z",
          "updatedAt": null
        }
      ]
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1
}
```

비밀번호(해시 포함)는 응답에 절대 포함되지 않습니다.

---

### `POST /api/entries`

새 글을 작성합니다.

**요청 바디**
```json
{
  "name": "홍길동",
  "content": "방명록 내용입니다.",
  "password": "비밀번호(4자 이상)",
  "captchaToken": "GET /api/captcha 에서 받은 token",
  "captchaAnswer": 8
}
```

| 필드 | 제약 |
|---|---|
| `name` | 1~20자, 필수 |
| `content` | 1~500자, 필수 |
| `password` | 4~72자, 필수 (해시로 저장) |
| `captchaToken` / `captchaAnswer` | 필수, 정답 불일치 시 400 |

**응답 `201`**
```json
{
  "id": 5,
  "name": "홍길동",
  "content": "방명록 내용입니다.",
  "createdAt": "2026-08-08T00:20:00.000Z",
  "updatedAt": null,
  "replies": []
}
```

**에러**: `400`(검증 실패/캡차 오답), `429`(도배 방지)

---

### `PATCH /api/entries/{id}`

본인 비밀번호 확인 후 글을 수정합니다.

**요청 바디**
```json
{ "name": "홍길동", "content": "수정된 내용", "password": "작성 시 설정한 비밀번호" }
```

**응답 `200`**: 수정된 글 객체 (`GET /api/entries`의 개별 항목과 동일한 형태, `replies` 포함)

**에러**: `400`(검증 실패), `403`(비밀번호 불일치), `404`(존재하지 않는/삭제된 글), `429`(비밀번호 다회 실패 잠금)

---

### `DELETE /api/entries/{id}`

본인 비밀번호 확인 후 글을 삭제합니다(소프트 삭제). 삭제된 글과 하위 답글은 이후 목록 조회에서 제외됩니다.

**요청 바디**
```json
{ "password": "작성 시 설정한 비밀번호" }
```

**응답 `200`**
```json
{ "ok": true }
```

**에러**: `400`, `403`(비밀번호 불일치), `404`, `429`(비밀번호 다회 실패 잠금)

---

## 답글 (Reply)

### `POST /api/entries/{id}/replies`

특정 글에 답글을 작성합니다. 원글이 존재하지 않거나 삭제된 경우 작성할 수 없습니다.

**요청 바디**
```json
{
  "name": "답글러",
  "content": "답글 내용",
  "password": "비밀번호(4자 이상)",
  "captchaToken": "GET /api/captcha 에서 받은 token",
  "captchaAnswer": 8
}
```

`content`는 1~300자. 나머지 제약은 글 작성과 동일합니다.

**응답 `201`**
```json
{
  "id": 3,
  "entryId": 1,
  "name": "답글러",
  "content": "답글 내용",
  "createdAt": "2026-08-08T00:20:30.000Z",
  "updatedAt": null
}
```

**에러**: `400`, `404`(원글 없음/삭제됨), `429`

---

### `PATCH /api/replies/{id}`

본인 비밀번호 확인 후 답글을 수정합니다.

**요청 바디**
```json
{ "name": "답글러", "content": "수정된 답글", "password": "작성 시 설정한 비밀번호" }
```

**응답 `200`**: 수정된 답글 객체

**에러**: `400`, `403`, `404`(답글 또는 원글이 삭제됨), `429`

---

### `DELETE /api/replies/{id}`

본인 비밀번호 확인 후 답글을 삭제합니다(소프트 삭제).

**요청 바디**
```json
{ "password": "작성 시 설정한 비밀번호" }
```

**응답 `200`**
```json
{ "ok": true }
```

**에러**: `400`, `403`, `404`, `429`

---

## 관리자 (Admin)

관리자 API는 로그인 후 발급되는 `admin_session` 쿠키(HttpOnly, 2시간 유효)로 인증합니다. 브라우저에서는 `fetch`에 `credentials`가 기본 포함되므로 별도 처리가 필요 없습니다.

### `POST /api/admin/login`

**요청 바디**
```json
{ "username": "admin", "password": "admin" }
```

**응답 `200`**: `admin_session` 쿠키 설정 + 아래 바디
```json
{ "username": "admin" }
```

**에러**: `400`(값 누락), `401`(아이디/비밀번호 불일치), `429`(동일 IP 5분 내 5회 실패 시 잠금)

---

### `POST /api/admin/logout`

세션 쿠키를 만료시킵니다. 요청 바디 없음.

**응답 `200`**
```json
{ "ok": true }
```

---

### `GET /api/admin/me`

현재 세션이 로그인 상태인지 확인합니다. 항상 `200`을 반환합니다.

**응답 (로그인 상태)**
```json
{ "admin": { "username": "admin" } }
```

**응답 (비로그인 상태)**
```json
{ "admin": null }
```

---

### `DELETE /api/admin/entries/{id}`

관리자 권한으로 비밀번호 확인 없이 글을 강제 삭제합니다(소프트 삭제).

**응답 `200`**
```json
{ "ok": true }
```

**에러**: `401`(관리자 미인증), `404`(존재하지 않는/이미 삭제된 글)

---

### `DELETE /api/admin/replies/{id}`

관리자 권한으로 답글을 강제 삭제합니다.

**응답 `200`**
```json
{ "ok": true }
```

**에러**: `401`, `404`

---

### `GET /api/admin/export`

현재 삭제되지 않은 모든 글/답글을 엑셀(.xlsx) 파일로 내보냅니다.

- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="guestbook-export-YYYY-MM-DD-HH-mm-ss.xlsx"`
- 시트 구성: `글`(id, 이름, 내용, 작성일시, 수정일시, 답글 수), `답글`(id, 원글 ID, 이름, 내용, 작성일시, 수정일시)
- 비밀번호(해시 포함)는 어떤 경우에도 포함되지 않습니다.

**에러**: `401`(관리자 미인증, JSON `{ "error": "..." }` 응답)

---

## 엔드포인트 요약

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| GET | `/api/captcha` | - | 캡차 문제 발급 |
| GET | `/api/entries` | - | 글 목록 조회 (페이지네이션) |
| POST | `/api/entries` | 캡차 | 글 작성 |
| PATCH | `/api/entries/{id}` | 비밀번호 | 글 수정 |
| DELETE | `/api/entries/{id}` | 비밀번호 | 글 삭제 |
| POST | `/api/entries/{id}/replies` | 캡차 | 답글 작성 |
| PATCH | `/api/replies/{id}` | 비밀번호 | 답글 수정 |
| DELETE | `/api/replies/{id}` | 비밀번호 | 답글 삭제 |
| POST | `/api/admin/login` | - | 관리자 로그인 |
| POST | `/api/admin/logout` | 관리자 세션 | 관리자 로그아웃 |
| GET | `/api/admin/me` | - | 관리자 로그인 상태 확인 |
| DELETE | `/api/admin/entries/{id}` | 관리자 세션 | 글 강제 삭제 |
| DELETE | `/api/admin/replies/{id}` | 관리자 세션 | 답글 강제 삭제 |
| GET | `/api/admin/export` | 관리자 세션 | 전체 글/답글 엑셀 내보내기 |
